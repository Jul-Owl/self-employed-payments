import { Injectable } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async getDashboard(ownerId: string) {
    // Get balance aggregates from Ledger (source of truth)
    const totalAmount = await this.ledgerService.getTotalReceived(ownerId);
    const totalTax = await this.ledgerService.getTaxReserve(ownerId);
    const totalPlatformFee =
      await this.ledgerService.getPlatformFeeReserve(ownerId);
    const available = await this.ledgerService.getAvailableBalance(ownerId);

    // Get recent transactions for display
    const transactions = await this.prisma.transaction.findMany({
      where: { ownerId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        receipt: true,
      },
    });

    const pendingReceipts = transactions.filter(
      (item) => item.receipt?.status === 'PENDING',
    ).length;

    const failedReceipts = transactions.filter(
      (item) => item.receipt?.status === 'FAILED',
    ).length;

    return {
      balance: {
        available,
        taxReserve: totalTax,
        platformFeeReserve: totalPlatformFee,
        processing: pendingReceipts > 0 ? totalAmount : 0,
      },
      summary: {
        totalAmount,
        totalTax,
        totalPlatformFee,
        available,
        pendingReceipts,
        failedReceipts,
      },
      recentTransactions: transactions,
    };
  }
}