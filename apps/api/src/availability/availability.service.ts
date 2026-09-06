import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CatalogItemType } from '@prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import { parseCalendarDate } from '../calendar/calendar-date.helper';
import {
  BookingIntervalItem,
  BookingIntervals,
  calculateBookingIntervals,
  getBookingIntervalRequirements,
} from '../booking/booking-interval.helper';
import { PrismaService } from '../prisma/prisma.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

const DEFAULT_STEP_MINUTES = 15;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
  ) {}

  async getAvailability(dto: GetAvailabilityDto, ownerId: string) {
    const stepMinutes = dto.stepMinutes ?? DEFAULT_STEP_MINUTES;
    this.validateStepMinutes(stepMinutes);

    const [items, resolvedDay] = await Promise.all([
      this.getIntervalItems(dto.catalogItemIds, ownerId),
      this.calendarService.resolveDay(dto.date, ownerId),
    ]);
    const requirements = getBookingIntervalRequirements(items);

    if (
      !resolvedDay.isWorking ||
      resolvedDay.startMinutes === null ||
      resolvedDay.endMinutes === null
    ) {
      return {
        date: resolvedDay.date,
        ...requirements,
        slots: [],
      };
    }

    const confirmedBookings = await this.prisma.booking.findMany({
      where: {
        ownerId,
        bookingDate: parseCalendarDate(dto.date),
        status: BookingStatus.CONFIRMED,
      },
      select: {
        reservedStartMinutes: true,
        reservedEndMinutes: true,
      },
    });
    const slots: Array<BookingIntervals & { startMinutes: number }> = [];

    for (
      let startMinutes = resolvedDay.startMinutes;
      startMinutes < resolvedDay.endMinutes;
      startMinutes += stepMinutes
    ) {
      if (
        startMinutes - requirements.bufferBeforeMinutes <
          resolvedDay.startMinutes ||
        startMinutes + requirements.durationMinutes + requirements.bufferAfterMinutes >
          resolvedDay.endMinutes
      ) {
        continue;
      }

      const intervals = calculateBookingIntervals(startMinutes, items);

      if (
        !confirmedBookings.some(
          (booking) =>
            booking.reservedStartMinutes < intervals.reservedEndMinutes &&
            booking.reservedEndMinutes > intervals.reservedStartMinutes,
        )
      ) {
        slots.push({
          startMinutes,
          ...intervals,
        });
      }
    }

    return {
      date: resolvedDay.date,
      ...requirements,
      slots,
    };
  }

  private async getIntervalItems(catalogItemIds: string[], ownerId: string) {
    const catalogItems = await this.prisma.catalogItem.findMany({
      where: {
        ownerId,
        id: { in: catalogItemIds },
      },
      select: {
        id: true,
        type: true,
        isActive: true,
        isBookable: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    });
    const catalogItemsById = new Map(
      catalogItems.map((catalogItem) => [catalogItem.id, catalogItem]),
    );

    return catalogItemIds.map<BookingIntervalItem>((catalogItemId, position) => {
      const catalogItem = catalogItemsById.get(catalogItemId);

      if (!catalogItem) {
        throw new NotFoundException(
          `CatalogItem with id "${catalogItemId}" was not found`,
        );
      }

      if (!catalogItem.isActive) {
        throw new BadRequestException(
          `CatalogItem with id "${catalogItemId}" is inactive`,
        );
      }

      if (
        catalogItem.type === CatalogItemType.SERVICE &&
        !catalogItem.isBookable
      ) {
        throw new BadRequestException(
          `CatalogItem with id "${catalogItemId}" is not bookable`,
        );
      }

      return {
        type: catalogItem.type,
        position,
        durationMinutes: catalogItem.durationMinutes,
        bufferBeforeMinutes:
          catalogItem.type === CatalogItemType.SERVICE
            ? catalogItem.bufferBeforeMinutes
            : null,
        bufferAfterMinutes:
          catalogItem.type === CatalogItemType.SERVICE
            ? catalogItem.bufferAfterMinutes
            : null,
      };
    });
  }

  private validateStepMinutes(stepMinutes: number) {
    if (
      !Number.isInteger(stepMinutes) ||
      stepMinutes < 5 ||
      stepMinutes > 120
    ) {
      throw new BadRequestException(
        'stepMinutes must be an integer between 5 and 120',
      );
    }
  }
}
