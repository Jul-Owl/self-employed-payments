import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(ownerId: string) {
    return this.prisma.transaction.findMany({
      where: { ownerId },
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

  async findOne(id: string, ownerId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, ownerId },
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

    if (!transaction) {
      throw new NotFoundException(`Transaction with id "${id}" was not found`);
    }

    return transaction;
  }

  create(body: any, ownerId: string) {
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
        ownerId,
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