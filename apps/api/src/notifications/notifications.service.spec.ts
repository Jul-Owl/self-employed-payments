import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Booking,
  BookingItem,
  BookingItemType,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationProvider } from './notification.provider';
import { NotificationService } from './notifications.service';

describe('NotificationService', () => {
  const notification = {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  };
  const transactionClient = {
    notification,
    $queryRaw: jest.fn(),
  };
  const prisma = {
    notification,
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const provider = {
    send: jest.fn(),
  } as unknown as NotificationProvider;
  const service = new NotificationService(prisma, provider);
  const NOW = new Date('2026-09-06T09:00:00.000Z');

  const booking = (
    overrides: Partial<Booking & { items: BookingItem[] }> = {},
  ) =>
    ({
      id: 'booking-id',
      ownerId: 'owner-id',
      bookingDate: new Date('2026-09-08T00:00:00.000Z'),
      startMinutes: 600,
      serviceEndMinutes: 660,
      reservedStartMinutes: 600,
      reservedEndMinutes: 660,
      status: 'CONFIRMED',
      totalAmount: 1500,
      customerName: 'Ирина',
      customerPhone: null,
      customerEmail: 'irina@example.test',
      comment: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          id: 'item-id',
          bookingId: 'booking-id',
          position: 0,
          catalogItemId: 'catalog-id',
          type: BookingItemType.SERVICE,
          title: 'Консультация',
          description: null,
          unitPrice: 1500,
          quantity: 1,
          lineTotalAmount: 1500,
          unit: null,
          durationMinutes: 60,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          createdAt: NOW,
        },
      ],
      ...overrides,
    }) as Booking & { items: BookingItem[] };

  beforeEach(() => {
    jest.clearAllMocks();
    notification.create.mockResolvedValue({ id: 'notification-id' });
    notification.update.mockResolvedValue({});
    notification.updateMany.mockResolvedValue({ count: 1 });
    transactionClient.$queryRaw.mockResolvedValue([]);
    prisma.$transaction = jest.fn(async (operation) =>
      operation(transactionClient),
    ) as unknown as PrismaService['$transaction'];
  });

  it('creates confirmation and reminder snapshots for an email booking', async () => {
    await service.createForBookingCreated(
      transactionClient as unknown as Prisma.TransactionClient,
      booking(),
      NOW,
    );

    expect(notification.create).toHaveBeenCalledTimes(2);
    expect(notification.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'owner-id',
          bookingId: 'booking-id',
          type: NotificationType.BOOKING_CONFIRMATION,
          channel: NotificationChannel.EMAIL,
          recipient: 'irina@example.test',
          scheduledFor: NOW,
        }),
      }),
    );
    expect(notification.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          type: NotificationType.BOOKING_REMINDER,
          scheduledFor: new Date('2026-09-07T10:00:00.000Z'),
          payloadSnapshot: expect.objectContaining({
            customerName: 'Ирина',
            bookingDate: '2026-09-08',
            startMinutes: 600,
            serviceTitles: ['Консультация'],
            totalAmount: 1500,
          }),
        }),
      }),
    );
  });

  it('does not create notifications without an email or reminder under 24 hours', async () => {
    await service.createForBookingCreated(
      transactionClient as unknown as Prisma.TransactionClient,
      booking({ customerEmail: null }),
      NOW,
    );
    await service.createForBookingCreated(
      transactionClient as unknown as Prisma.TransactionClient,
      booking({
        bookingDate: new Date('2026-09-07T00:00:00.000Z'),
        startMinutes: 480,
      }),
      NOW,
    );

    expect(notification.create).toHaveBeenCalledTimes(1);
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: NotificationType.BOOKING_CONFIRMATION,
        }),
      }),
    );
  });

  it('keeps payload data immutable after the booking snapshot changes', async () => {
    const sourceBooking = booking();

    await service.createForBookingCreated(
      transactionClient as unknown as Prisma.TransactionClient,
      sourceBooking,
      NOW,
    );
    sourceBooking.customerName = 'Другое имя';
    sourceBooking.items[0].title = 'Другая услуга';

    expect(notification.create.mock.calls[0][0].data.payloadSnapshot).toEqual(
      expect.objectContaining({
        customerName: 'Ирина',
        serviceTitles: ['Консультация'],
      }),
    );
  });

  it('cancels only pending reminders and creates a cancellation notification', async () => {
    await service.createForBookingCancelled(
      transactionClient as unknown as Prisma.TransactionClient,
      booking(),
      NOW,
    );

    expect(notification.updateMany).toHaveBeenCalledWith({
      where: {
        bookingId: 'booking-id',
        type: NotificationType.BOOKING_REMINDER,
        status: NotificationStatus.PENDING,
      },
      data: {
        status: NotificationStatus.CANCELLED,
        cancelledAt: NOW,
      },
    });
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: NotificationType.BOOKING_CANCELLED,
        }),
      }),
    );
  });

  it('replaces a pending reminder when a booking is rescheduled', async () => {
    await service.createForBookingRescheduled(
      transactionClient as unknown as Prisma.TransactionClient,
      booking({ bookingDate: new Date('2026-09-10T00:00:00.000Z') }),
      NOW,
    );

    expect(notification.updateMany).toHaveBeenCalledTimes(1);
    expect(notification.create).toHaveBeenCalledTimes(2);
    expect(notification.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          type: NotificationType.BOOKING_RESCHEDULED,
        }),
      }),
    );
    expect(notification.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          type: NotificationType.BOOKING_REMINDER,
          scheduledFor: new Date('2026-09-09T10:00:00.000Z'),
        }),
      }),
    );
  });

  it('only cancels pending reminders on completion', async () => {
    await service.cancelForBookingCompleted(
      transactionClient as unknown as Prisma.TransactionClient,
      'booking-id',
      NOW,
    );

    expect(notification.updateMany).toHaveBeenCalledTimes(1);
    expect(notification.create).not.toHaveBeenCalled();
  });

  it('dispatches a due notification once and ignores it on repeated dispatch', async () => {
    transactionClient.$queryRaw
      .mockResolvedValueOnce([{ id: 'notification-id' }])
      .mockResolvedValue([]);
    notification.findUniqueOrThrow.mockResolvedValue({
      id: 'notification-id',
      type: NotificationType.BOOKING_REMINDER,
      recipient: 'irina@example.test',
      payloadSnapshot: { customerName: 'Ирина' },
    });

    await expect(service.dispatchDue(NOW)).resolves.toEqual({
      sent: 1,
      failed: 0,
    });
    await expect(service.dispatchDue(NOW)).resolves.toEqual({
      sent: 0,
      failed: 0,
    });

    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-id' },
      data: {
        status: NotificationStatus.SENT,
        sentAt: NOW,
      },
    });
  });

  it('does not dispatch a future notification', async () => {
    transactionClient.$queryRaw.mockResolvedValue([]);

    await expect(service.dispatchDue(NOW)).resolves.toEqual({
      sent: 0,
      failed: 0,
    });

    expect(provider.send).not.toHaveBeenCalled();
    expect(transactionClient.$queryRaw.mock.calls[0][0].join('')).toContain(
      '"scheduledFor" <= ',
    );
  });

  it('uses SKIP LOCKED claiming to prevent concurrent duplicate sends', async () => {
    let claimed = false;
    transactionClient.$queryRaw.mockImplementation(async () => {
      if (claimed) {
        return [];
      }
      claimed = true;
      return [{ id: 'notification-id' }];
    });
    notification.findUniqueOrThrow.mockResolvedValue({
      id: 'notification-id',
      type: NotificationType.BOOKING_REMINDER,
      recipient: 'irina@example.test',
      payloadSnapshot: {},
    });
    (provider.send as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => setImmediate(resolve)),
    );

    await Promise.all([service.dispatchDue(NOW), service.dispatchDue(NOW)]);

    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('marks a due notification as failed with its provider error', async () => {
    transactionClient.$queryRaw
      .mockResolvedValueOnce([{ id: 'notification-id' }])
      .mockResolvedValue([]);
    notification.findUniqueOrThrow.mockResolvedValue({
      id: 'notification-id',
      type: NotificationType.BOOKING_CONFIRMATION,
      recipient: 'irina@example.test',
      payloadSnapshot: {},
    });
    (provider.send as jest.Mock).mockRejectedValue(new Error('Local failure'));

    await expect(service.dispatchDue(NOW)).resolves.toEqual({
      sent: 0,
      failed: 1,
    });

    expect(notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-id' },
      data: {
        status: NotificationStatus.FAILED,
        failedAt: NOW,
        failureReason: 'Local failure',
      },
    });
  });

  it('scopes listing and lookup to the owner', async () => {
    notification.findMany.mockResolvedValue([]);
    notification.findFirst.mockResolvedValue({ id: 'notification-id' });

    await service.findAll(
      {
        bookingId: 'booking-id',
        status: NotificationStatus.PENDING,
        type: NotificationType.BOOKING_REMINDER,
        dateFrom: '2026-09-06T00:00:00.000Z',
        dateTo: '2026-09-07T00:00:00.000Z',
      },
      'owner-id',
    );
    await service.findOne('notification-id', 'owner-id');

    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: 'owner-id',
          bookingId: 'booking-id',
          status: NotificationStatus.PENDING,
          type: NotificationType.BOOKING_REMINDER,
        }),
      }),
    );
    expect(notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-id', ownerId: 'owner-id' },
    });
  });

  it('returns a safe 404 and rejects inverted notification dates', async () => {
    notification.findFirst.mockResolvedValue(null);

    await expect(service.findOne('other-owner-id', 'owner-id')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.findAll(
        {
          dateFrom: '2026-09-07T00:00:00.000Z',
          dateTo: '2026-09-06T00:00:00.000Z',
        },
        'owner-id',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
