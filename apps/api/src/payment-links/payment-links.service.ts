import { Injectable, NotFoundException } from '@nestjs/common';
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

  findAll(ownerId: string) {
    return this.prisma.paymentLink.findMany({
      where: { ownerId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, ownerId: string) {
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: { id, ownerId },
      include: {
        transactions: {
          where: { ownerId },
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

    if (!paymentLink) {
      throw new NotFoundException(`PaymentLink with id "${id}" was not found`);
    }

    return paymentLink;
  }

  create(body: any, ownerId: string) {
    return this.prisma.paymentLink.create({
      data: {
        ownerId,
        title: body.title,
        amount: Number(body.amount),
        payerType: body.payerType,
        status: PaymentLinkStatus.ACTIVE,
      },
    });
  }

  async simulatePayment(id: string, ownerId: string) {
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: { id, ownerId },
    });

    if (!paymentLink) {
      throw new NotFoundException(`PaymentLink with id "${id}" was not found`);
    }

    const grossAmount = paymentLink.amount;
    const taxAmount = Math.round(grossAmount * 0.04);
    const platformFeeAmount = Math.round(grossAmount * 0.01);
    const netAmount = grossAmount - taxAmount - platformFeeAmount;

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          ownerId: paymentLink.ownerId,
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