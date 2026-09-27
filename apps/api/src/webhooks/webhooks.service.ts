import { Injectable } from '@nestjs/common';
import {
  BookingPaymentStatus,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
  TransactionStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';

type PaymentContext = {
  ownerId: string;
  paymentLinkId: string | null;
  bookingId: string | null;
  paymentId: string | null;
  expectedAmount: number | null;
};

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly bookingService: BookingService,
  ) {}

  async handlePaymentWebhook(payload: any) {
    const provider = payload.provider ?? 'test-provider';

    const externalPaymentId =
      payload.externalPaymentId ?? payload.paymentId ?? null;

    const paymentLinkId = payload.paymentLinkId ?? null;

    const idempotencyKey =
      payload.idempotencyKey ?? payload.eventId ?? crypto.randomUUID();

    const eventType = payload.eventType ?? payload.type ?? 'payment.updated';

    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_idempotencyKey: {
          provider,
          idempotencyKey,
        },
      },
    });

    if (existingEvent) {
      return {
        duplicated: true,
        webhookEvent: existingEvent,
      };
    }

    const amount = Number(payload.amount ?? 0);

    if (eventType === 'payment.failed') {
      const result = await this.prisma.$transaction(async (tx) => {
        const webhookEvent = await tx.webhookEvent.create({
          data: {
            provider,
            eventType,
            externalPaymentId,
            idempotencyKey,
            status: WebhookEventStatus.RECEIVED,
            payload,
          },
        });

        const paymentContext = await this.findPaymentContext(
          tx,
          paymentLinkId,
          externalPaymentId,
        );

        if (!paymentContext) {
          const failedWebhookEvent = await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              status: WebhookEventStatus.FAILED,
              errorMessage: 'Payment link could not be resolved for webhook',
              processedAt: new Date(),
            },
          });

          return { webhookEvent: failedWebhookEvent, transaction: null };
        }

        const transaction = await tx.transaction.create({
          data: {
            ownerId: paymentContext.ownerId,
            title: payload.title ?? 'Неуспешная оплата',
            client: payload.client ?? 'Клиент из webhook',
            grossAmount: amount,
            taxAmount: 0,
            platformFeeAmount: 0,
            netAmount: 0,
            date: 'только что',
            status: TransactionStatus.FAILED,
            externalPaymentId,
            externalStatus: eventType,
            paymentLinkId: paymentContext.paymentLinkId,
          },
        });

        let bookingPaymentFailed = false;

        if (paymentContext.paymentId) {
          const paymentUpdate = await tx.payment.updateMany({
            where: {
              id: paymentContext.paymentId,
              status: {
                in: [PaymentStatus.CREATED, PaymentStatus.PENDING],
              },
            },
            data: { status: PaymentStatus.FAILED },
          });

          bookingPaymentFailed = paymentUpdate.count > 0;
        } else {
          await tx.payment.updateMany({
            where: { externalPaymentId },
            data: { status: PaymentStatus.FAILED },
          });
        }

        if (paymentContext.bookingId && bookingPaymentFailed) {
          await tx.booking.updateMany({
            where: { id: paymentContext.bookingId },
            data: { paymentStatus: BookingPaymentStatus.FAILED },
          });
        }

        const updatedWebhookEvent = await tx.webhookEvent.update({
          where: {
            id: webhookEvent.id,
          },
          data: {
            status: WebhookEventStatus.PROCESSED,
            processedAt: new Date(),
          },
        });

        return {
          webhookEvent: updatedWebhookEvent,
          transaction,
        };
      });

      return {
        duplicated: false,
        ...result,
      };
    }

    if (eventType !== 'payment.succeeded' || amount <= 0) {
      const webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider,
          eventType,
          externalPaymentId,
          idempotencyKey,
          status: WebhookEventStatus.RECEIVED,
          payload,
        },
      });

      return {
        duplicated: false,
        webhookEvent,
      };
    }

    const grossAmount = amount;
    const taxAmount = Math.round(grossAmount * 0.04);
    const platformFeeAmount = Math.round(grossAmount * 0.01);
    const netAmount = grossAmount - taxAmount - platformFeeAmount;

    const result = await this.prisma.$transaction(async (tx) => {
      const webhookEvent = await tx.webhookEvent.create({
        data: {
          provider,
          eventType,
          externalPaymentId,
          idempotencyKey,
          status: WebhookEventStatus.RECEIVED,
          payload,
        },
      });

      const paymentContext = await this.findPaymentContext(
        tx,
        paymentLinkId,
        externalPaymentId,
      );

      if (!paymentContext) {
        const failedWebhookEvent = await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: WebhookEventStatus.FAILED,
            errorMessage: 'Payment link could not be resolved for webhook',
            processedAt: new Date(),
          },
        });

        return {
          webhookEvent: failedWebhookEvent,
          transaction: null,
          receipt: null,
        };
      }

      if (
        paymentContext.bookingId &&
        paymentContext.expectedAmount !== grossAmount
      ) {
        const failedWebhookEvent = await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: WebhookEventStatus.FAILED,
            errorMessage:
              'Booking payment amount does not match the required amount',
            processedAt: new Date(),
          },
        });

        return {
          webhookEvent: failedWebhookEvent,
          transaction: null,
          receipt: null,
        };
      }

      if (paymentContext.paymentId) {
        const claimedPayment = await tx.payment.updateMany({
          where: {
            id: paymentContext.paymentId,
            status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
          },
          data: { status: PaymentStatus.SUCCEEDED },
        });

        if (claimedPayment.count === 0) {
          const updatedWebhookEvent = await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              status: WebhookEventStatus.PROCESSED,
              processedAt: new Date(),
            },
          });

          return {
            duplicated: true,
            webhookEvent: updatedWebhookEvent,
            transaction: null,
            receipt: null,
          };
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          ownerId: paymentContext.ownerId,
          title: payload.title ?? 'Оплата по внешнему API',
          client: payload.client ?? 'Клиент из webhook',
          grossAmount,
          taxAmount,
          platformFeeAmount,
          netAmount,
          date: 'только что',
          status: TransactionStatus.PROCESSED,
          externalPaymentId,
          externalStatus: eventType,
          paymentLinkId: paymentContext.paymentLinkId,
        },
      });

      if (!paymentContext.paymentId) {
        await tx.payment.updateMany({
          where: { externalPaymentId },
          data: { status: PaymentStatus.SUCCEEDED },
        });
      }

      if (paymentContext.bookingId) {
        await tx.booking.updateMany({
          where: {
            id: paymentContext.bookingId,
          },
          data: { paymentStatus: BookingPaymentStatus.PAID },
        });
      }

      const receipt = await tx.receipt.create({
        data: {
          title: transaction.title,
          client: transaction.client,
          amount: grossAmount,
          status: ReceiptStatus.PENDING,
          date: 'только что',
          transactionId: transaction.id,
        },
      });

      await this.ledgerService.createTransactionEntries(
        {
          transactionId: transaction.id,
          grossAmount,
          taxAmount,
          platformFeeAmount,
          netAmount,
        },
        tx,
      );

      const updatedWebhookEvent = await tx.webhookEvent.update({
        where: {
          id: webhookEvent.id,
        },
        data: {
          status: WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return {
        webhookEvent: updatedWebhookEvent,
        transaction,
        receipt,
      };
    });

    if (result.transaction && this.prisma.payment) {
      const payment = await this.prisma.payment.findUnique({ where: { externalPaymentId }, select: { bookingId: true } });
      if (payment?.bookingId) await this.bookingService.reconcilePaidBooking(payment.bookingId);
    }

    return {
      duplicated: false,
      ...result,
    };
  }

  findAll() {
    return this.prisma.webhookEvent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async findPaymentContext(
    tx: Prisma.TransactionClient,
    paymentLinkId: string | null,
    externalPaymentId: string | null,
  ) {
    if (externalPaymentId) {
      const payment = await tx.payment.findUnique({
        where: { externalPaymentId },
        select: {
          id: true,
          amount: true,
          paymentLink: { select: { id: true, ownerId: true } },
          booking: {
            select: {
              id: true,
              ownerId: true,
            },
          },
        },
      });

      if (payment?.booking) {
        return {
          ownerId: payment.booking.ownerId,
          paymentLinkId: null,
          bookingId: payment.booking.id,
          paymentId: payment.id,
          expectedAmount: payment.amount,
        } satisfies PaymentContext;
      }

      if (payment?.paymentLink) {
        return {
          ownerId: payment.paymentLink.ownerId,
          paymentLinkId: payment.paymentLink.id,
          bookingId: null,
          paymentId: payment.id,
          expectedAmount: payment.amount,
        } satisfies PaymentContext;
      }
    }

    if (!paymentLinkId) {
      return null;
    }

    const paymentLink = await tx.paymentLink.findUnique({
      where: { id: paymentLinkId },
      select: { id: true, ownerId: true },
    });

    return paymentLink
      ? {
          ownerId: paymentLink.ownerId,
          paymentLinkId: paymentLink.id,
          bookingId: null,
          paymentId: null,
          expectedAmount: null,
        }
      : null;
  }
}
