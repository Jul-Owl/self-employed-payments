import { Injectable } from '@nestjs/common';
import {
  PaymentLinkStatus,
  ReceiptStatus,
  TransactionStatus,
} from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  findAll() {
    return this.prisma.paymentLink.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.paymentLink.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            receipt: true,
            ledgerEntries: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });
  }

  create(body: any) {
    return this.prisma.paymentLink.create({
      data: {
        title: body.title,
        amount: Number(body.amount),
        payerType: body.payerType,
        status: PaymentLinkStatus.ACTIVE,
      },
    });
  }

  async simulatePayment(id: string) {
    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: { id },
    });

    if (!paymentLink) {
      return null;
    }

    const grossAmount = paymentLink.amount;
    const taxAmount = Math.round(grossAmount * 0.04);
    const platformFeeAmount = Math.round(grossAmount * 0.01);
    const netAmount = grossAmount - taxAmount - platformFeeAmount;

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          title: paymentLink.title,
          client: 'Тестовый клиент',
          grossAmount,
          taxAmount,
          platformFeeAmount,
          netAmount,
          date: 'только что',
          status: TransactionStatus.PROCESSED,
          paymentLinkId: paymentLink.id,
        },
      });

      const receipt = await tx.receipt.create({
        data: {
          title: paymentLink.title,
          client: 'Тестовый клиент',
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

      const ledgerEntries = await tx.ledgerEntry.findMany({
        where: {
          transactionId: transaction.id,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return {
        paymentLink,
        transaction,
        receipt,
        ledgerEntries,
      };
    });

    return result;
  }
}