import { BadRequestException } from '@nestjs/common';
import { BookingItemType, CatalogItemType } from '@prisma/client';

export interface BookingIntervalItem {
  type: BookingItemType | CatalogItemType;
  position: number;
  durationMinutes: number | null;
  bufferBeforeMinutes: number | null;
  bufferAfterMinutes: number | null;
}

export interface BookingIntervalRequirements {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface BookingIntervals {
  serviceEndMinutes: number;
  reservedStartMinutes: number;
  reservedEndMinutes: number;
}

export function getBookingIntervalRequirements(
  items: BookingIntervalItem[],
): BookingIntervalRequirements {
  const serviceItems = items
    .filter((item) => item.type === BookingItemType.SERVICE)
    .sort((left, right) => left.position - right.position);

  if (serviceItems.length === 0) {
    throw new BadRequestException(
      'Booking must contain at least one SERVICE item',
    );
  }

  const durationMinutes = serviceItems.reduce(
    (total, item) => total + requirePositiveValue(item.durationMinutes),
    0,
  );

  serviceItems.forEach((item) => {
    requireNonNegativeValue(item.bufferBeforeMinutes);
    requireNonNegativeValue(item.bufferAfterMinutes);
  });

  return {
    durationMinutes,
    bufferBeforeMinutes: requireNonNegativeValue(
      serviceItems[0].bufferBeforeMinutes,
    ),
    bufferAfterMinutes: requireNonNegativeValue(
      serviceItems[serviceItems.length - 1].bufferAfterMinutes,
    ),
  };
}

export function calculateBookingIntervals(
  startMinutes: number,
  items: BookingIntervalItem[],
): BookingIntervals {
  const requirements = getBookingIntervalRequirements(items);
  const serviceEndMinutes = startMinutes + requirements.durationMinutes;
  const reservedStartMinutes =
    startMinutes - requirements.bufferBeforeMinutes;
  const reservedEndMinutes = serviceEndMinutes + requirements.bufferAfterMinutes;

  if (
    startMinutes < 0 ||
    startMinutes > 1439 ||
    serviceEndMinutes > 1439 ||
    reservedStartMinutes < 0 ||
    reservedEndMinutes > 1439 ||
    reservedStartMinutes >= reservedEndMinutes
  ) {
    throw new BadRequestException(
      'Booking interval is outside the supported Calendar minute range',
    );
  }

  return {
    serviceEndMinutes,
    reservedStartMinutes,
    reservedEndMinutes,
  };
}

function requirePositiveValue(value: number | null) {
  if (value === null || value <= 0) {
    throw new BadRequestException('Booking SERVICE snapshots are invalid');
  }

  return value;
}

function requireNonNegativeValue(value: number | null) {
  if (value === null || value < 0) {
    throw new BadRequestException('Booking SERVICE snapshots are invalid');
  }

  return value;
}
