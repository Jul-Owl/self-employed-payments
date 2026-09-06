import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  BookingItemType,
  BookingStatus,
  CatalogItemType,
  CatalogItemUnit,
  Prisma,
} from '@prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import { NotificationService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  const catalogItem = {
    findMany: jest.fn(),
  };
  const booking = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const transactionClient = { catalogItem, booking };
  const prisma = {
    $transaction: jest.fn(),
    booking,
  } as unknown as PrismaService;
  const calendarService = {
    resolveDay: jest.fn(),
    resolveDayInTransaction: jest.fn(),
  } as unknown as CalendarService;
  const notificationService = {
    createForBookingCreated: jest.fn(),
    createForBookingRescheduled: jest.fn(),
    createForBookingCancelled: jest.fn(),
    cancelForBookingCompleted: jest.fn(),
  } as unknown as NotificationService;
  const service = new BookingService(
    prisma,
    calendarService,
    notificationService,
  );
  const OWNER_ID = 'owner-id';
  const create = (dto: Parameters<BookingService['create']>[0]) =>
    service.create(dto, OWNER_ID);
  const findAll = (dto: Parameters<BookingService['findAll']>[0]) =>
    service.findAll(dto, OWNER_ID);
  const getRescheduleAvailability = (
    id: string,
    dto: Parameters<BookingService['getRescheduleAvailability']>[1],
  ) => service.getRescheduleAvailability(id, dto, OWNER_ID);
  const reschedule = (
    id: string,
    dto: Parameters<BookingService['reschedule']>[1],
  ) => service.reschedule(id, dto, OWNER_ID);
  const complete = (id: string) => service.complete(id, OWNER_ID);

  const serviceCatalogItem = {
    id: 'service-id',
    title: 'Консультация',
    description: 'Описание',
    type: CatalogItemType.SERVICE,
    isActive: true,
    isBookable: true,
    price: 1000,
    durationMinutes: 60,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 15,
    unit: null,
  };
  const productCatalogItem = {
    id: 'product-id',
    title: 'Материалы',
    description: null,
    type: CatalogItemType.PRODUCT,
    isActive: true,
    isBookable: false,
    price: 300,
    durationMinutes: null,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    unit: CatalogItemUnit.PIECE,
  };

  const createDto = {
    bookingDate: '2026-08-10',
    startMinutes: 600,
    customerName: 'Ирина',
    customerPhone: '+79990000000',
    items: [{ catalogItemId: 'service-id', quantity: 1 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction = jest.fn(async (operation) =>
      operation(transactionClient),
    ) as unknown as PrismaService['$transaction'];
    catalogItem.findMany.mockResolvedValue([serviceCatalogItem]);
    booking.findFirst.mockResolvedValue(null);
    calendarService.resolveDayInTransaction.mockResolvedValue({
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });
    booking.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'booking-id',
        ...data,
        bookingDate: new Date('2026-08-10T00:00:00.000Z'),
      }),
    );
  });

  it('creates a Booking with a SERVICE snapshot and calculated interval', async () => {
    await expect(create(createDto)).resolves.toMatchObject({
      id: 'booking-id',
      bookingDate: '2026-08-10',
    });

    expect(booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startMinutes: 600,
        serviceEndMinutes: 660,
        reservedStartMinutes: 590,
        reservedEndMinutes: 675,
        totalAmount: 1000,
        items: {
          create: [
            expect.objectContaining({
              type: BookingItemType.SERVICE,
              position: 0,
              unitPrice: 1000,
              quantity: 1,
              lineTotalAmount: 1000,
              durationMinutes: 60,
            }),
          ],
        },
      }),
      include: { items: true },
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
  });

  it('uses an inclusive date range with status filtering and chronological order', async () => {
    booking.findMany.mockResolvedValue([]);
    await findAll({
      dateFrom: '2026-08-10',
      dateTo: '2026-08-12',
      status: BookingStatus.CONFIRMED,
    });
    expect(booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerId: OWNER_ID,
          bookingDate: {
            gte: new Date('2026-08-10T00:00:00.000Z'),
            lte: new Date('2026-08-12T00:00:00.000Z'),
          },
          status: BookingStatus.CONFIRMED,
        },
        orderBy: [{ bookingDate: 'asc' }, { startMinutes: 'asc' }],
      }),
    );
  });

  it('rejects an inverted Booking date range', async () => {
    await expect(
      findAll({ dateFrom: '2026-08-12', dateTo: '2026-08-10' }),
    ).rejects.toThrow('dateFrom must be before or equal to dateTo');
  });

  it('calculates reschedule availability from BookingItem snapshots', async () => {
    booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-id',
        status: BookingStatus.CONFIRMED,
        items: [
          {
            type: BookingItemType.SERVICE,
            position: 0,
            durationMinutes: 60,
            bufferBeforeMinutes: 10,
            bufferAfterMinutes: 15,
          },
        ],
      })
      .mockResolvedValueOnce(null);
    booking.findMany.mockResolvedValue([]);
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-08-11',
      isWorking: true,
      startMinutes: 540,
      endMinutes: 720,
    });

    await expect(
      getRescheduleAvailability('booking-id', {
        date: '2026-08-11',
        stepMinutes: 60,
      }),
    ).resolves.toMatchObject({
      durationMinutes: 60,
      slots: [expect.objectContaining({ startMinutes: 600 })],
    });
    expect(catalogItem.findMany).not.toHaveBeenCalled();
  });

  it('creates a Booking with an additional PRODUCT', async () => {
    catalogItem.findMany.mockResolvedValue([
      serviceCatalogItem,
      productCatalogItem,
    ]);

    await create({
      ...createDto,
      items: [
        { catalogItemId: 'service-id', quantity: 1 },
        { catalogItemId: 'product-id', quantity: 2 },
      ],
    });

    expect(booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 1600,
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                type: BookingItemType.SERVICE,
                position: 0,
              }),
              expect.objectContaining({
                type: BookingItemType.PRODUCT,
                position: 1,
                quantity: 2,
                lineTotalAmount: 600,
                durationMinutes: null,
              }),
            ]),
          },
        }),
      }),
    );
  });

  it('uses only the first and last SERVICE buffers for a multi-SERVICE interval', async () => {
    const secondServiceCatalogItem = {
      ...serviceCatalogItem,
      id: 'second-service-id',
      title: 'Повторная консультация',
      durationMinutes: 60,
      bufferBeforeMinutes: 40,
      bufferAfterMinutes: 15,
    };
    catalogItem.findMany.mockResolvedValue([
      {
        ...serviceCatalogItem,
        durationMinutes: 30,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 50,
      },
      secondServiceCatalogItem,
    ]);

    await create({
      ...createDto,
      items: [
        { catalogItemId: 'service-id', quantity: 1 },
        { catalogItemId: 'second-service-id', quantity: 1 },
      ],
    });

    expect(booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceEndMinutes: 690,
          reservedStartMinutes: 590,
          reservedEndMinutes: 705,
          items: {
            create: [
              expect.objectContaining({ position: 0 }),
              expect.objectContaining({ position: 1 }),
            ],
          },
        }),
      }),
    );
  });

  it('rejects a PRODUCT-only Booking', async () => {
    catalogItem.findMany.mockResolvedValue([productCatalogItem]);

    await expect(
      create({
        ...createDto,
        items: [{ catalogItemId: 'product-id', quantity: 1 }],
      }),
    ).rejects.toThrow('Booking must contain at least one SERVICE item');
  });

  it('rejects a CatalogItem that belongs to another owner', async () => {
    catalogItem.findMany.mockResolvedValue([]);

    await expect(
      create({
        ...createDto,
        items: [{ catalogItemId: 'other-owner-item-id', quantity: 1 }],
      }),
    ).rejects.toThrow(
      'CatalogItem with id "other-owner-item-id" was not found',
    );
    expect(catalogItem.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: OWNER_ID,
        id: { in: ['other-owner-item-id'] },
      },
    });
  });

  it('rejects SERVICE quantity greater than one', async () => {
    await expect(
      create({
        ...createDto,
        items: [{ catalogItemId: 'service-id', quantity: 2 }],
      }),
    ).rejects.toThrow('SERVICE quantity must be 1');
  });

  it('requires at least one customer contact', async () => {
    await expect(
      create({
        ...createDto,
        customerPhone: undefined,
        customerEmail: '  ',
      }),
    ).rejects.toThrow('customerPhone or customerEmail is required');
  });

  it('rejects an interval outside the resolved Calendar interval', async () => {
    calendarService.resolveDayInTransaction.mockResolvedValue({
      isWorking: true,
      startMinutes: 620,
      endMinutes: 1080,
    });

    await expect(create(createDto)).rejects.toThrow(
      'Booking interval must fit within the resolved Calendar interval',
    );
  });

  it('rejects an overlapping confirmed Booking', async () => {
    booking.findFirst.mockResolvedValue({ id: 'existing-booking-id' });

    await expect(create(createDto)).rejects.toThrow(
      'Booking interval overlaps an existing booking',
    );
  });

  it('reschedules without changing BookingItem snapshots', async () => {
    booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-id',
        status: BookingStatus.CONFIRMED,
        items: [
          {
            type: BookingItemType.SERVICE,
            position: 0,
            durationMinutes: 60,
            bufferBeforeMinutes: 10,
            bufferAfterMinutes: 15,
          },
        ],
      })
      .mockResolvedValueOnce(null);
    booking.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'booking-id',
        ...data,
        bookingDate: new Date('2026-08-11T00:00:00.000Z'),
        items: [],
      }),
    );

    await reschedule('booking-id', {
      bookingDate: '2026-08-11',
      startMinutes: 700,
    });

    expect(booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-id' },
      data: {
        bookingDate: new Date('2026-08-11T00:00:00.000Z'),
        startMinutes: 700,
        serviceEndMinutes: 760,
        reservedStartMinutes: 690,
        reservedEndMinutes: 775,
      },
      include: { items: true },
    });
    expect(catalogItem.findMany).not.toHaveBeenCalled();
  });

  it('allows a terminal transition only from CONFIRMED', async () => {
    booking.updateMany.mockResolvedValue({ count: 0 });
    booking.findFirst.mockResolvedValue({
      id: 'booking-id',
      status: BookingStatus.CANCELLED,
    });

    await expect(complete('booking-id')).rejects.toThrow(ConflictException);
  });

  it('allows confirmed Bookings with adjacent reserved intervals', async () => {
    const existingBooking = {
      id: 'existing-booking-id',
      reservedStartMinutes: 590,
      reservedEndMinutes: 675,
    };
    booking.findFirst.mockImplementation(({ where }) => {
      const overlaps =
        existingBooking.reservedStartMinutes < where.reservedEndMinutes.lt &&
        existingBooking.reservedEndMinutes > where.reservedStartMinutes.gt;

      return Promise.resolve(overlaps ? existingBooking : null);
    });

    await expect(
      create({
        ...createDto,
        startMinutes: 685,
      }),
    ).resolves.toMatchObject({
      id: 'booking-id',
    });
  });

  it('retries P2034 and succeeds on the second attempt', async () => {
    const serializationConflict = new Prisma.PrismaClientKnownRequestError(
      'write conflict',
      {
        code: 'P2034',
        clientVersion: '7.7.0',
      },
    );
    prisma.$transaction = jest
      .fn()
      .mockRejectedValueOnce(serializationConflict)
      .mockImplementation(async (operation) =>
        operation(transactionClient),
      ) as unknown as PrismaService['$transaction'];

    await expect(create(createDto)).resolves.toMatchObject({
      id: 'booking-id',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('returns Conflict after three P2034 attempts', async () => {
    const serializationConflict = new Prisma.PrismaClientKnownRequestError(
      'write conflict',
      {
        code: 'P2034',
        clientVersion: '7.7.0',
      },
    );
    prisma.$transaction = jest
      .fn()
      .mockRejectedValue(
        serializationConflict,
      ) as unknown as PrismaService['$transaction'];

    await expect(create(createDto)).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
