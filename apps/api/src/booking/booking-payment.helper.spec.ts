import { BadRequestException } from '@nestjs/common';
import { CatalogItemPaymentPolicy } from '@prisma/client';
import { calculateRequiredPaymentAmount } from './booking-payment.helper';

describe('calculateRequiredPaymentAmount', () => {
  it.each([
    [CatalogItemPaymentPolicy.NO_PREPAYMENT, null, 1000, 0],
    [null, null, 1000, 0],
    [CatalogItemPaymentPolicy.FIXED_PREPAYMENT, 250, 1000, 250],
    [CatalogItemPaymentPolicy.PERCENT_PREPAYMENT, 25, 1000, 250],
    [CatalogItemPaymentPolicy.FULL_PREPAYMENT, null, 1000, 1000],
  ])(
    'calculates %s',
    (paymentPolicy, prepaymentValue, lineTotalAmount, expected) => {
      expect(
        calculateRequiredPaymentAmount([
          { paymentPolicy, prepaymentValue, lineTotalAmount },
        ]),
      ).toBe(expected);
    },
  );

  it('rounds percentage prepayment with the project Math.round convention', () => {
    expect(
      calculateRequiredPaymentAmount([
        {
          paymentPolicy: CatalogItemPaymentPolicy.PERCENT_PREPAYMENT,
          prepaymentValue: 15,
          lineTotalAmount: 101,
        },
      ]),
    ).toBe(15);
  });

  it('sums immutable line requirements for a mixed booking', () => {
    expect(
      calculateRequiredPaymentAmount([
        {
          paymentPolicy: CatalogItemPaymentPolicy.FIXED_PREPAYMENT,
          prepaymentValue: 100,
          lineTotalAmount: 500,
        },
        {
          paymentPolicy: CatalogItemPaymentPolicy.PERCENT_PREPAYMENT,
          prepaymentValue: 20,
          lineTotalAmount: 300,
        },
      ]),
    ).toBe(160);
  });

  it.each([
    [CatalogItemPaymentPolicy.FIXED_PREPAYMENT, 0, 100],
    [CatalogItemPaymentPolicy.FIXED_PREPAYMENT, 101, 100],
    [CatalogItemPaymentPolicy.PERCENT_PREPAYMENT, 0, 100],
    [CatalogItemPaymentPolicy.PERCENT_PREPAYMENT, 101, 100],
  ])(
    'rejects invalid payment configuration %s/%i',
    (paymentPolicy, prepaymentValue, lineTotalAmount) => {
      expect(() =>
        calculateRequiredPaymentAmount([
          { paymentPolicy, prepaymentValue, lineTotalAmount },
        ]),
      ).toThrow(BadRequestException);
    },
  );
});
