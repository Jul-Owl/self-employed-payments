import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { TbankPaymentsService } from '../providers/tbank/tbank-payments.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tbankPaymentsService: TbankPaymentsService,
  ) {}

  async createPayment(body: any, ownerId: string) {
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: {
        id: body.paymentLinkId,
        ownerId,
      },
    });

    if (!paymentLink) {
      throw new NotFoundException('Payment link not found');
    }

    const providerPayment =
      await this.tbankPaymentsService.createPayment({
        paymentLinkId: paymentLink.id,
        amount: paymentLink.amount,
        description: paymentLink.title,
      });

    return this.prisma.payment.create({
      data: {
        provider: providerPayment.provider,
        externalPaymentId: providerPayment.externalPaymentId,
        paymentUrl: providerPayment.paymentUrl,
        amount: providerPayment.amount,
        status: PaymentStatus.CREATED,
        paymentLinkId: paymentLink.id,
      },
    });
  }

  findAll(ownerId: string) {
    return this.prisma.payment.findMany({
      where: { paymentLink: { ownerId } },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        paymentLink: true,
      },
    });
  }
}