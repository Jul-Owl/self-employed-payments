import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service';
import { BookingService } from '../booking/booking.service';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicBookingService } from './public-booking.service';

describe('PublicBookingService', () => {
  const user = {
    findUnique: jest.fn(),
  };
  const prisma = { user } as unknown as PrismaService;
  const catalogService = {
    findBookableServices: jest.fn(),
  } as unknown as CatalogService;
  const availabilityService = {
    getAvailability: jest.fn(),
  } as unknown as AvailabilityService;
  const bookingService = {
    create: jest.fn(),
  } as unknown as BookingService;
  const service = new PublicBookingService(
    prisma,
    catalogService,
    availabilityService,
    bookingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: 'owner-id' });
  });

  it('loads catalog services only for the owner resolved from the public slug', async () => {
    catalogService.findBookableServices.mockResolvedValue([]);

    await expect(service.findBookableServices('studio-a')).resolves.toEqual([]);

    expect(user.findUnique).toHaveBeenCalledWith({
      where: { publicSlug: 'studio-a' },
      select: { id: true },
    });
    expect(catalogService.findBookableServices).toHaveBeenCalledWith('owner-id');
  });

  it('does not expose availability or bookings for an unknown slug', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(
      service.getAvailability('unknown', {
        date: '2026-09-12',
        catalogItemIds: ['catalog-item-id'],
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createBooking('unknown', {
        bookingDate: '2026-09-12',
        startMinutes: 600,
        customerName: 'Ирина',
        customerPhone: '+79990000000',
        items: [{ catalogItemId: 'catalog-item-id', quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);

    expect(availabilityService.getAvailability).not.toHaveBeenCalled();
    expect(bookingService.create).not.toHaveBeenCalled();
  });

  it('passes the resolved owner to booking creation for owner-scoped snapshots', async () => {
    const dto = {
      bookingDate: '2026-09-12',
      startMinutes: 600,
      customerName: 'Ирина',
      customerPhone: '+79990000000',
      items: [{ catalogItemId: 'other-owner-item-id', quantity: 1 }],
    };
    bookingService.create.mockResolvedValue({ id: 'booking-id' });

    await service.createBooking('studio-a', dto);

    expect(bookingService.create).toHaveBeenCalledWith(dto, 'owner-id');
  });

  it('rejects client overrides to catalog prices and durations', async () => {
    await expect(
      service.createBooking('studio-a', {
        bookingDate: '2026-09-12',
        startMinutes: 600,
        customerName: 'Ирина',
        customerPhone: '+79990000000',
        items: [
          {
            catalogItemId: 'catalog-item-id',
            quantity: 1,
            unitPrice: 1,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(user.findUnique).toHaveBeenCalledWith({
      where: { publicSlug: 'studio-a' },
      select: { id: true },
    });
    expect(bookingService.create).not.toHaveBeenCalled();
  });
});
