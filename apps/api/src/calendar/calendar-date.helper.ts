import { BadRequestException } from '@nestjs/common';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(value: string): Date {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    throw new BadRequestException('date must use the YYYY-MM-DD format');
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('date must be a valid calendar date');
  }

  return date;
}

export function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
