import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        receipt: true,
      },
    });

    const totalAmount = transactions.reduce(
      (sum, item) => sum + item.grossAmount,
      0,
    );

    const totalTax = transactions.reduce(
      (sum, item) => sum + item.taxAmount,
      0,
    );

    const totalPlatformFee = transactions.reduce(
      (sum, item) => sum + item.platformFeeAmount,
      0,
    );

    const available = transactions.reduce(
      (sum, item) => sum + item.netAmount,
      0,
    );

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