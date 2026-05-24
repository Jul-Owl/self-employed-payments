import { Injectable } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransactionEntries(params: {
    transactionId: string;
    grossAmount: number;
    taxAmount: number;
    platformFeeAmount: number;
    netAmount: number;
  }) {
    const {
      transactionId,
      grossAmount,
      taxAmount,
      platformFeeAmount,
      netAmount,
    } = params;

    return this.prisma.ledgerEntry.createMany({
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

  findAll() {
    return this.prisma.ledgerEntry.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transaction: true,
      },
    });
  }
}