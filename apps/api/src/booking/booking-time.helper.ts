/**
 * MVP business timezone. Booking dates are civil dates for the Russian MVP,
 * not instants; keep this decision in one place until a per-owner timezone
 * setting is introduced.
 */
export const BOOKING_TIME_ZONE = 'Europe/Moscow';

function partsInBusinessTimezone(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function businessDateToday(now = new Date()) {
  const { year, month, day } = partsInBusinessTimezone(now);
  return new Date(Date.UTC(year, month - 1, day));
}

export function bookingMomentInBusinessTimezone(bookingDate: Date, minutes: number) {
  const { year, month, day } = {
    year: bookingDate.getUTCFullYear(),
    month: bookingDate.getUTCMonth() + 1,
    day: bookingDate.getUTCDate(),
  };
  // Europe/Moscow is UTC+03:00 and has no DST. The named timezone above is
  // deliberately the source-of-truth declaration for this MVP.
  return new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60) - 3, minutes % 60));
}
