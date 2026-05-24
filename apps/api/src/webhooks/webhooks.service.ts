import { Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  ReceiptStatus,
  TransactionStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

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

        const transaction = await tx.transaction.create({
          data: {
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
            paymentLinkId,
          },
        });

        await tx.payment.updateMany({
          where: {
            externalPaymentId,
          },
          data: {
            status: PaymentStatus.FAILED,
          },
        });

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

      const transaction = await tx.transaction.create({
        data: {
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
          paymentLinkId,
        },
      });

      await tx.payment.updateMany({
        where: {
          externalPaymentId,
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
        },
      });

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

      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: transaction.id,
            type: LedgerEntryType.CLIENT_PAYMENT_RECEIVED,
            direction: LedgerDirection.CREDIT,
            amount: grossAmount,
          },
          {
            transactionId: transaction.id,
            type: LedgerEntryType.TAX_RESERVED,
            direction: LedgerDirection.DEBIT,
            amount: taxAmount,
          },
          {
            transactionId: transaction.id,
            type: LedgerEntryType.PLATFORM_FEE_RESERVED,
            direction: LedgerDirection.DEBIT,
            amount: platformFeeAmount,
          },
          {
            transactionId: transaction.id,
            type: LedgerEntryType.SELF_EMPLOYED_BALANCE,
            direction: LedgerDirection.CREDIT,
            amount: netAmount,
          },
        ],
      });

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
}