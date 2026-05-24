import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptStatus } from '@prisma/client';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.receipt.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.receipt.findUnique({
      where: { id },
    });
  }

  create(body: any) {
    return this.prisma.receipt.create({
      data: {
        title: body.title,
        client: body.client ?? 'Новый клиент',
        amount: Number(body.amount),
        status: body.status ?? ReceiptStatus.PENDING,
        date: body.date ?? 'только что',
      },
    });
  }
}