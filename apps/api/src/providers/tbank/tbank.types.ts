export type CreateTbankPaymentParams = {
  paymentLinkId: string;
  amount: number;
  description: string;
};

export type CreateTbankPaymentResult = {
  provider: 'tbank';
  externalPaymentId: string;
  paymentUrl: string;
  amount: number;
  status: 'created';
};