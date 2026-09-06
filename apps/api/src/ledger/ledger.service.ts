import { Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransactionEntries(
    params: {
      transactionId: string;
      grossAmount: number;
      taxAmount: number;
      platformFeeAmount: number;
      netAmount: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const {
      transactionId,
      grossAmount,
      taxAmount,
      platformFeeAmount,
      netAmount,
    } = params;

    const client = tx ?? this.prisma;

    return client.ledgerEntry.createMany({
      data: [
        {
          transactionId,
          type: LedgerEntryType.CLIENT_PAYMENT_RECEIVED,
          direction: LedgerDirection.CREDIT,
          amount: grossAmount,
        },
        {
          transactionId,
          type: LedgerEntryType.TAX_RESERVED,
          direction: LedgerDirection.DEBIT,
          amount: taxAmount,
        },
        {
          transactionId,
          type: LedgerEntryType.PLATFORM_FEE_RESERVED,
          direction: LedgerDirection.DEBIT,
          amount: platformFeeAmount,
        },
        {
          transactionId,
          type: LedgerEntryType.SELF_EMPLOYED_BALANCE,
          direction: LedgerDirection.CREDIT,
          amount: netAmount,
        },
      ],
    });
  }

  findAll(ownerId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { transaction: { ownerId } },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transaction: true,
      },
    });
  }

  async getTotalReceived(ownerId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: {
        transaction: { ownerId },
        type: LedgerEntryType.CLIENT_PAYMENT_RECEIVED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  async getTaxReserve(ownerId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: {
        transaction: { ownerId },
        type: LedgerEntryType.TAX_RESERVED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  async getPlatformFeeReserve(ownerId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: {
        transaction: { ownerId },
        type: LedgerEntryType.PLATFORM_FEE_RESERVED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  async getAvailableBalance(ownerId: string): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: {
        transaction: { ownerId },
        type: LedgerEntryType.SELF_EMPLOYED_BALANCE,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }
}