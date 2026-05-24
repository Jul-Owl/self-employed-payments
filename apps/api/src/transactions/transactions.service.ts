import { Injectable } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.transaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        receipt: true,
        paymentLink: true,
        ledgerEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        receipt: true,
        paymentLink: true,
        ledgerEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  create(body: any) {
    const grossAmount = Number(body.grossAmount ?? body.amount ?? 0);
    const taxAmount = Number(body.taxAmount ?? Math.round(grossAmount * 0.04));
    const platformFeeAmount = Number(
      body.platformFeeAmount ?? Math.round(grossAmount * 0.01),
    );
    const netAmount = Number(
      body.netAmount ?? grossAmount - taxAmount - platformFeeAmount,
    );

    return this.prisma.transaction.create({
      data: {
        title: body.title,
        client: body.client ?? 'Новый клиент',
        grossAmount,
        taxAmount,
        platformFeeAmount,
        netAmount,
        date: body.date ?? 'только что',
        status: body.status ?? TransactionStatus.PROCESSED,
      },
    });
  }
}