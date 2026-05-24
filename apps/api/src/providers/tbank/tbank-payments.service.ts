import { Injectable } from '@nestjs/common';
import {
  CreateTbankPaymentParams,
  CreateTbankPaymentResult,
} from './tbank.types';

@Injectable()
export class TbankPaymentsService {
  async createPayment(
    params: CreateTbankPaymentParams,
  ): Promise<CreateTbankPaymentResult> {
    const externalPaymentId = `tbank_mock_${Date.now()}`;

    return {
      provider: 'tbank',
      externalPaymentId,
      paymentUrl: `https://pay.test/${externalPaymentId}`,
      amount: params.amount,
      status: 'created',
    };
  }
}