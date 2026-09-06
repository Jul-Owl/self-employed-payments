import { BadRequestException } from '@nestjs/common';
import { BookingStatus, CatalogItemType } from '@prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const catalogItem = {
    findMany: jest.fn(),
  };
  const booking = {
    findMany: jest.fn(),
  };
  const prisma = {
    catalogItem,
    booking,
  } as unknown as PrismaService;
  const calendarService = {
    resolveDay: jest.fn(),
  } as unknown as CalendarService;
  const service = new AvailabilityService(prisma, calendarService);
  const OWNER_ID = 'owner-id';
  const getAvailability = (dto: Parameters<AvailabilityService['getAvailability']>[0]) =>
    service.getAvailability(dto, OWNER_ID);

  const serviceCatalogItem = {
    id: 'service-id',
    type: CatalogItemType.SERVICE,
    isActive: true,
    isBookable: true,
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  };
  const productCatalogItem = {
    id: 'product-id',
    type: CatalogItemType.PRODUCT,
    isActive: true,
    isBookable: false,
    durationMinutes: null,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  };
  const dto = {
    date: '2026-09-12',
    catalogItemIds: ['service-id'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    catalogItem.findMany.mockResolvedValue([serviceCatalogItem]);
    booking.findMany.mockResolvedValue([]);
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-09-12',
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
      resolvedBy: 'WEEKLY_SCHEDULE',
      resolvedRule: 'WEEKLY_WORKING',
    });
  });

  it('returns no slots for a non-working day', async () => {
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-09-12',
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
      resolvedBy: 'WEEKLY_SCHEDULE',
      resolvedRule: 'WEEKLY_CLOSED',
    });

    await expect(getAvailability(dto)).resolves.toMatchObject({
      date: '2026-09-12',
      slots: [],
    });
    expect(booking.findMany).not.toHaveBeenCalled();
  });

  it('generates simple slots within the resolved working interval', async () => {
    const result = await getAvailability({
      ...dto,
      stepMinutes: 60,
    });

    expect(result.slots.map((slot) => slot.startMinutes)).toEqual([
      540, 600, 660, 720, 780, 840, 900, 960, 1020,
    ]);
  });

  it('keeps buffered slots entirely within working hours', async () => {
    catalogItem.findMany.mockResolvedValue([
      {
        ...serviceCatalogItem,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
      },
    ]);

    const result = await getAvailability({
      ...dto,
      stepMinutes: 15,
    });

    expect(result.slots[0]).toMatchObject({
      startMinutes: 555,
      reservedStartMinutes: 540,
      reservedEndMinutes: 630,
    });
    expect(result.slots[result.slots.length - 1]).toMatchObject({
      startMinutes: 1005,
      reservedStartMinutes: 990,
      reservedEndMinutes: 1080,
    });
  });

  it('uses the first and last SERVICE buffers for multiple services', async () => {
    catalogItem.findMany.mockResolvedValue([
      {
        ...serviceCatalogItem,
        id: 'service-a',
        durationMinutes: 30,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 50,
      },
      {
        ...serviceCatalogItem,
        id: 'service-b',
        durationMinutes: 60,
        bufferBeforeMinutes: 40,
        bufferAfterMinutes: 15,
      },
    ]);

    const result = await getAvailability({
      ...dto,
      catalogItemIds: ['service-a', 'service-b'],
      stepMinutes: 10,
    });

    expect(result).toMatchObject({
      durationMinutes: 90,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
    });
    expect(result.slots[0]).toMatchObject({
      startMinutes: 550,
      serviceEndMinutes: 640,
      reservedStartMinutes: 540,
      reservedEndMinutes: 655,
    });
  });

  it('does not let a PRODUCT change the SERVICE interval', async () => {
    catalogItem.findMany.mockResolvedValue([
      serviceCatalogItem,
      productCatalogItem,
    ]);

    const result = await getAvailability({
      ...dto,
      catalogItemIds: ['service-id', 'product-id'],
      stepMinutes: 60,
    });

    expect(result).toMatchObject({
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    });
    expect(result.slots.map((slot) => slot.startMinutes)).toEqual([
      540, 600, 660, 720, 780, 840, 900, 960, 1020,
    ]);
  });

  it('rejects a PRODUCT-only request', async () => {
    catalogItem.findMany.mockResolvedValue([productCatalogItem]);

    await expect(
      getAvailability({
        ...dto,
        catalogItemIds: ['product-id'],
      }),
    ).rejects.toThrow('Booking must contain at least one SERVICE item');
  });

  it('rejects an inactive CatalogItem', async () => {
    catalogItem.findMany.mockResolvedValue([
      {
        ...serviceCatalogItem,
        isActive: false,
      },
    ]);

    await expect(getAvailability(dto)).rejects.toThrow(
      'CatalogItem with id "service-id" is inactive',
    );
  });

  it('excludes slots that overlap a confirmed Booking', async () => {
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-09-12',
      isWorking: true,
      startMinutes: 540,
      endMinutes: 720,
      resolvedBy: 'WEEKLY_SCHEDULE',
      resolvedRule: 'WEEKLY_WORKING',
    });
    booking.findMany.mockResolvedValue([
      {
        reservedStartMinutes: 590,
        reservedEndMinutes: 610,
      },
    ]);

    const result = await getAvailability({
      ...dto,
      stepMinutes: 60,
    });

    expect(result.slots.map((slot) => slot.startMinutes)).toEqual([660]);
    expect(booking.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: OWNER_ID,
        bookingDate: new Date('2026-09-12T00:00:00.000Z'),
        status: BookingStatus.CONFIRMED,
      },
      select: {
        reservedStartMinutes: true,
        reservedEndMinutes: true,
      },
    });
  });

  it('allows a slot adjacent to a confirmed Booking', async () => {
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-09-12',
      isWorking: true,
      startMinutes: 540,
      endMinutes: 660,
      resolvedBy: 'WEEKLY_SCHEDULE',
      resolvedRule: 'WEEKLY_WORKING',
    });
    booking.findMany.mockResolvedValue([
      {
        reservedStartMinutes: 480,
        reservedEndMinutes: 540,
      },
    ]);

    const result = await getAvailability({
      ...dto,
      stepMinutes: 60,
    });

    expect(result.slots.map((slot) => slot.startMinutes)).toEqual([540, 600]);
  });

  it.each([BookingStatus.CANCELLED, BookingStatus.COMPLETED])(
    'does not treat a %s Booking as a conflict',
    async (status) => {
      booking.findMany.mockImplementation(({ where }) =>
        Promise.resolve(
          where.status === status
            ? [
                {
                  reservedStartMinutes: 540,
                  reservedEndMinutes: 1080,
                },
              ]
            : [],
        ),
      );

      await expect(
        getAvailability({
          ...dto,
          stepMinutes: 120,
        }),
      ).resolves.toMatchObject({
        slots: expect.any(Array),
      });

      expect(booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: BookingStatus.CONFIRMED,
          }),
        }),
      );
    },
  );

  it('uses the Calendar override resolution for a non-working day', async () => {
    calendarService.resolveDay.mockResolvedValue({
      date: '2026-09-12',
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
      resolvedBy: 'OVERRIDE',
      resolvedRule: 'CLOSED',
    });

    await expect(getAvailability(dto)).resolves.toMatchObject({
      slots: [],
    });
    expect(calendarService.resolveDay).toHaveBeenCalledWith('2026-09-12', OWNER_ID);
  });

  it.each([0, 4, 121, 7.5])(
    'rejects invalid stepMinutes %p',
    async (stepMinutes) => {
      await expect(
        getAvailability({
          ...dto,
          stepMinutes,
        }),
      ).rejects.toThrow(BadRequestException);
    },
  );
});
