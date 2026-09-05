import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingItemType,
  BookingStatus,
  CatalogItem,
  CatalogItemType,
  Prisma,
} from '@prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import {
  formatCalendarDate,
  parseCalendarDate,
} from '../calendar/calendar-date.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, CreateBookingItemDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

interface BookingItemSnapshot {
  catalogItemId: string;
  position: number;
  type: BookingItemType;
  title: string;
  description: string | null;
  unitPrice: number;
  quantity: number;
  lineTotalAmount: number;
  unit: CatalogItem['unit'];
  durationMinutes: number | null;
  bufferBeforeMinutes: number | null;
  bufferAfterMinutes: number | null;
}

interface BookingIntervals {
  serviceEndMinutes: number;
  reservedStartMinutes: number;
  reservedEndMinutes: number;
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
  ) {}

  async findAll(dto: ListBookingsDto) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        bookingDate: dto.date ? parseCalendarDate(dto.date) : undefined,
        status: dto.status,
      },
      include: { items: true },
      orderBy: [{ bookingDate: 'asc' }, { startMinutes: 'asc' }],
    });

    return bookings.map((booking) => this.serializeBooking(booking));
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" was not found`);
    }

    return this.serializeBooking(booking);
  }

  async create(dto: CreateBookingDto) {
    this.validateCustomerContacts(dto);

    const booking = await this.withSerializableRetry(async (tx) => {
      const bookingDate = parseCalendarDate(dto.bookingDate);
      const snapshots = await this.createSnapshots(tx, dto.items);
      const intervals = this.calculateIntervals(dto.startMinutes, snapshots);

      await this.validateCalendarInterval(
        tx,
        dto.bookingDate,
        intervals.reservedStartMinutes,
        intervals.reservedEndMinutes,
      );
      await this.ensureNoOverlap(
        tx,
        bookingDate,
        intervals.reservedStartMinutes,
        intervals.reservedEndMinutes,
      );

      return tx.booking.create({
        data: {
          bookingDate,
          startMinutes: dto.startMinutes,
          ...intervals,
          totalAmount: snapshots.reduce(
            (total, item) => total + item.lineTotalAmount,
            0,
          ),
          customerName: dto.customerName.trim(),
          customerPhone: this.normalizeOptionalText(dto.customerPhone),
          customerEmail: this.normalizeOptionalText(dto.customerEmail),
          comment: this.normalizeOptionalText(dto.comment),
          items: {
            create: snapshots,
          },
        },
        include: { items: true },
      });
    });

    return this.serializeBooking(booking);
  }

  async reschedule(id: string, dto: RescheduleBookingDto) {
    const booking = await this.withSerializableRetry(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with id "${id}" was not found`);
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException('Only confirmed bookings can be rescheduled');
      }

      const bookingDate = parseCalendarDate(dto.bookingDate);
      const intervals = this.calculateIntervals(dto.startMinutes, booking.items);

      await this.validateCalendarInterval(
        tx,
        dto.bookingDate,
        intervals.reservedStartMinutes,
        intervals.reservedEndMinutes,
      );
      await this.ensureNoOverlap(
        tx,
        bookingDate,
        intervals.reservedStartMinutes,
        intervals.reservedEndMinutes,
        id,
      );

      return tx.booking.update({
        where: { id },
        data: {
          bookingDate,
          startMinutes: dto.startMinutes,
          ...intervals,
        },
        include: { items: true },
      });
    });

    return this.serializeBooking(booking);
  }

  async cancel(id: string) {
    return this.transitionToTerminalStatus(id, BookingStatus.CANCELLED);
  }

  async complete(id: string) {
    return this.transitionToTerminalStatus(id, BookingStatus.COMPLETED);
  }

  private async transitionToTerminalStatus(id: string, status: BookingStatus) {
    const timestampField =
      status === BookingStatus.CANCELLED ? 'cancelledAt' : 'completedAt';
    const now = new Date();
    const result = await this.prisma.booking.updateMany({
      where: {
        id,
        status: BookingStatus.CONFIRMED,
      },
      data: {
        status,
        [timestampField]: now,
      },
    });

    if (result.count === 0) {
      const booking = await this.prisma.booking.findUnique({ where: { id } });

      if (!booking) {
        throw new NotFoundException(`Booking with id "${id}" was not found`);
      }

      throw new ConflictException(
        'Only confirmed bookings can change to a terminal status',
      );
    }

    return this.findOne(id);
  }

  private async createSnapshots(
    tx: Prisma.TransactionClient,
    items: CreateBookingItemDto[],
  ): Promise<BookingItemSnapshot[]> {
    const catalogItems = await tx.catalogItem.findMany({
      where: {
        id: { in: items.map((item) => item.catalogItemId) },
      },
    });
    const catalogItemsById = new Map(
      catalogItems.map((catalogItem) => [catalogItem.id, catalogItem]),
    );
    const snapshots = items.map((item, position) => {
      const catalogItem = catalogItemsById.get(item.catalogItemId);

      if (!catalogItem) {
        throw new NotFoundException(
          `CatalogItem with id "${item.catalogItemId}" was not found`,
        );
      }

      return this.createSnapshot(catalogItem, item, position);
    });

    if (!snapshots.some((item) => item.type === BookingItemType.SERVICE)) {
      throw new BadRequestException(
        'Booking must contain at least one SERVICE item',
      );
    }

    return snapshots;
  }

  private createSnapshot(
    catalogItem: CatalogItem,
    input: CreateBookingItemDto,
    position: number,
  ): BookingItemSnapshot {
    if (!catalogItem.isActive) {
      throw new BadRequestException(
        `CatalogItem with id "${catalogItem.id}" is inactive`,
      );
    }

    const unitPrice = input.unitPrice ?? catalogItem.price;

    if (unitPrice === null) {
      throw new BadRequestException(
        `CatalogItem with id "${catalogItem.id}" has no price`,
      );
    }

    if (catalogItem.type === CatalogItemType.SERVICE) {
      if (!catalogItem.isBookable) {
        throw new BadRequestException(
          `CatalogItem with id "${catalogItem.id}" is not bookable`,
        );
      }

      if (input.quantity !== 1) {
        throw new BadRequestException('SERVICE quantity must be 1');
      }

      const durationMinutes = input.durationMinutes ?? catalogItem.durationMinutes;

      if (durationMinutes === null || durationMinutes <= 0) {
        throw new BadRequestException(
          `CatalogItem with id "${catalogItem.id}" requires a positive duration`,
        );
      }

      return {
        catalogItemId: catalogItem.id,
        position,
        type: BookingItemType.SERVICE,
        title: catalogItem.title,
        description: catalogItem.description,
        unitPrice,
        quantity: 1,
        lineTotalAmount: unitPrice,
        unit: null,
        durationMinutes,
        bufferBeforeMinutes: catalogItem.bufferBeforeMinutes,
        bufferAfterMinutes: catalogItem.bufferAfterMinutes,
      };
    }

    if (input.durationMinutes !== undefined) {
      throw new BadRequestException(
        'durationMinutes is only allowed for SERVICE items',
      );
    }

    return {
      catalogItemId: catalogItem.id,
      position,
      type: BookingItemType.PRODUCT,
      title: catalogItem.title,
      description: catalogItem.description,
      unitPrice,
      quantity: input.quantity,
      lineTotalAmount: unitPrice * input.quantity,
      unit: catalogItem.unit,
      durationMinutes: null,
      bufferBeforeMinutes: null,
      bufferAfterMinutes: null,
    };
  }

  private calculateIntervals(
    startMinutes: number,
    items: Array<
      Pick<
        BookingItemSnapshot,
        | 'type'
        | 'position'
        | 'durationMinutes'
        | 'bufferBeforeMinutes'
        | 'bufferAfterMinutes'
      >
    >,
  ): BookingIntervals {
    const serviceItems = items
      .filter((item) => item.type === BookingItemType.SERVICE)
      .sort((left, right) => left.position - right.position);

    if (serviceItems.length === 0) {
      throw new BadRequestException(
        'Booking must contain at least one SERVICE item',
      );
    }

    const durations = serviceItems.map((item) =>
      this.requirePositiveSnapshotValue(item.durationMinutes),
    );
    serviceItems.forEach((item) => {
      this.requireNonNegativeSnapshotValue(item.bufferBeforeMinutes);
      this.requireNonNegativeSnapshotValue(item.bufferAfterMinutes);
    });
    const serviceEndMinutes =
      startMinutes + durations.reduce((total, duration) => total + duration, 0);
    const reservedStartMinutes =
      startMinutes -
      this.requireNonNegativeSnapshotValue(
        serviceItems[0].bufferBeforeMinutes,
      );
    const reservedEndMinutes =
      serviceEndMinutes +
      this.requireNonNegativeSnapshotValue(
        serviceItems[serviceItems.length - 1].bufferAfterMinutes,
      );

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

  private async validateCalendarInterval(
    tx: Prisma.TransactionClient,
    bookingDate: string,
    reservedStartMinutes: number,
    reservedEndMinutes: number,
  ) {
    const resolution = await this.calendarService.resolveDayInTransaction(
      tx,
      bookingDate,
    );

    if (
      !resolution.isWorking ||
      resolution.startMinutes === null ||
      resolution.endMinutes === null ||
      reservedStartMinutes < resolution.startMinutes ||
      reservedEndMinutes > resolution.endMinutes
    ) {
      throw new BadRequestException(
        'Booking interval must fit within the resolved Calendar interval',
      );
    }
  }

  private async ensureNoOverlap(
    tx: Prisma.TransactionClient,
    bookingDate: Date,
    reservedStartMinutes: number,
    reservedEndMinutes: number,
    excludedBookingId?: string,
  ) {
    const overlap = await tx.booking.findFirst({
      where: {
        bookingDate,
        status: BookingStatus.CONFIRMED,
        id: excludedBookingId ? { not: excludedBookingId } : undefined,
        reservedStartMinutes: { lt: reservedEndMinutes },
        reservedEndMinutes: { gt: reservedStartMinutes },
      },
    });

    if (overlap) {
      throw new ConflictException('Booking interval overlaps an existing booking');
    }
  }

  private validateCustomerContacts(dto: CreateBookingDto) {
    if (
      !this.normalizeOptionalText(dto.customerPhone) &&
      !this.normalizeOptionalText(dto.customerEmail)
    ) {
      throw new BadRequestException(
        'customerPhone or customerEmail is required',
      );
    }
  }

  private normalizeOptionalText(value: string | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  private requirePositiveSnapshotValue(value: number | null) {
    if (value === null || value <= 0) {
      throw new BadRequestException('Booking SERVICE snapshots are invalid');
    }

    return value;
  }

  private requireNonNegativeSnapshotValue(value: number | null) {
    if (value === null || value < 0) {
      throw new BadRequestException('Booking SERVICE snapshots are invalid');
    }

    return value;
  }

  private async withSerializableRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (this.isSerializationConflict(error) && attempt < 3) {
          continue;
        }

        if (this.isSerializationConflict(error)) {
          throw new ConflictException(
            'Booking could not be saved because of a concurrent change',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Booking could not be saved because of a concurrent change',
    );
  }

  private isSerializationConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private serializeBooking<T extends { bookingDate: Date }>(booking: T) {
    return {
      ...booking,
      bookingDate: formatCalendarDate(booking.bookingDate),
    };
  }
}
