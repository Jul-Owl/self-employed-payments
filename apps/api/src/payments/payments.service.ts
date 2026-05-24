import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(body: any) {
    const paymentLink = await this.prisma.paymentLink.findUnique({
      where: {
        id: body.paymentLinkId,
      },
    });

    if (!paymentLink) {
      return {
        error: 'Payment link not found',
      };
    }

    const externalPaymentId = `mock_${Date.now()}`;
    const paymentUrl = `https://pay.test/${externalPaymentId}`;

    return this.prisma.payment.create({
      data: {
        provider: 'tbank',
        externalPaymentId,
        paymentUrl,
        amount: paymentLink.amount,
        status: PaymentStatus.CREATED,
        paymentLinkId: paymentLink.id,
      },
    });
  }

  findAll() {
    return this.prisma.payment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        paymentLink: true,
      },
    });
  }
}