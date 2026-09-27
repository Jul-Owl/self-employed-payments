import { BadRequestException } from '@nestjs/common';
import { CatalogItemPaymentPolicy } from '@prisma/client';

export interface BookingPaymentItem {
  paymentPolicy: CatalogItemPaymentPolicy | null;
  prepaymentValue: number | null;
  lineTotalAmount: number;
}

/**
 * Computes the booking requirement from immutable BookingItem snapshots. Each
 * SERVICE line contributes the amount required by its own payment policy;
 * PRODUCT lines currently have no policy and contribute zero. Summation keeps
 * mixed-service bookings deterministic without reading mutable CatalogItem
 * data after booking creation.
 */
export function calculateRequiredPaymentAmount(
  items: BookingPaymentItem[],
): number {
  return items.reduce(
    (total, item) => total + calculateItemPaymentAmount(item),
    0,
  );
}

function calculateItemPaymentAmount(item: BookingPaymentItem): number {
  if (
    !Number.isSafeInteger(item.lineTotalAmount) ||
    item.lineTotalAmount <= 0
  ) {
    throw new BadRequestException(
      'Booking item amount must be a positive integer',
    );
  }

  switch (item.paymentPolicy) {
    case CatalogItemPaymentPolicy.FULL_PREPAYMENT:
      return item.lineTotalAmount;
    case CatalogItemPaymentPolicy.FIXED_PREPAYMENT: {
      const value = item.prepaymentValue;
      if (
        value === null ||
        !Number.isSafeInteger(value) ||
        value <= 0 ||
        value > item.lineTotalAmount
      ) {
        throw new BadRequestException(
          'Fixed prepayment must be a positive integer not greater than the booking item amount',
        );
      }
      return value;
    }
    case CatalogItemPaymentPolicy.PERCENT_PREPAYMENT: {
      const value = item.prepaymentValue;
      if (
        value === null ||
        !Number.isSafeInteger(value) ||
        value <= 0 ||
        value > 100
      ) {
        throw new BadRequestException(
          'Percent prepayment must be an integer from 1 to 100',
        );
      }
      return Math.round((item.lineTotalAmount * value) / 100);
    }
    case CatalogItemPaymentPolicy.NO_PREPAYMENT:
    case null:
    default:
      return 0;
  }
}
