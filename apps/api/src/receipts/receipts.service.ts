import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptStatus } from '@prisma/client';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(ownerId: string) {
    return this.prisma.receipt.findMany({
      where: { transaction: { ownerId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ownerId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, transaction: { ownerId } },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with id "${id}" was not found`);
    }

    return receipt;
  }

  async create(body: any, ownerId: string) {
    if (typeof body.transactionId !== 'string') {
      throw new BadRequestException('transactionId is required');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: body.transactionId, ownerId },
      select: { id: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with id "${body.transactionId}" was not found`,
      );
    }

    return this.prisma.receipt.create({
      data: {
        title: body.title,
        client: body.client ?? 'Новый клиент',
        amount: Number(body.amount),
        status: body.status ?? ReceiptStatus.PENDING,
        date: body.date ?? 'только что',
        transactionId: transaction.id,
      },
    });
  }
}