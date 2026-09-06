import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingItem,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { formatCalendarDate } from '../calendar/calendar-date.helper';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NOTIFICATION_PROVIDER } from './notification.provider';
import type { NotificationProvider } from './notification.provider';

type BookingWithItems = Booking & { items: BookingItem[] };

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly provider: NotificationProvider,
  ) {}

  async findAll(dto: ListNotificationsDto, ownerId: string) {
    const dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : undefined;
    const dateTo = dto.dateTo ? new Date(dto.dateTo) : undefined;

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        'dateFrom must be before or equal to dateTo',
      );
    }

    return this.prisma.notification.findMany({
      where: {
        ownerId,
        bookingId: dto.bookingId,
        status: dto.status,
        type: dto.type,
        scheduledFor:
          dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, ownerId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, ownerId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" was not found`);
    }

    return notification;
  }

  async createForBookingCreated(
    tx: Prisma.TransactionClient,
    booking: BookingWithItems,
    now = new Date(),
  ) {
    if (!booking.customerEmail) {
      return;
    }

    await this.create(tx, booking, NotificationType.BOOKING_CONFIRMATION, now);
    await this.createReminderIfDue(tx, booking, now);
  }

  async createForBookingRescheduled(
    tx: Prisma.TransactionClient,
    booking: BookingWithItems,
    now = new Date(),
  ) {
    await this.cancelPendingReminders(tx, booking.id, now);

    if (!booking.customerEmail) {
      return;
    }

    await this.create(tx, booking, NotificationType.BOOKING_RESCHEDULED, now);
    await this.createReminderIfDue(tx, booking, now);
  }

  async createForBookingCancelled(
    tx: Prisma.TransactionClient,
    booking: BookingWithItems,
    now = new Date(),
  ) {
    await this.cancelPendingReminders(tx, booking.id, now);

    if (booking.customerEmail) {
      await this.create(tx, booking, NotificationType.BOOKING_CANCELLED, now);
    }
  }

  cancelForBookingCompleted(
    tx: Prisma.TransactionClient,
    bookingId: string,
    now = new Date(),
  ) {
    return this.cancelPendingReminders(tx, bookingId, now);
  }

  async dispatchDue(now: Date) {
    let sent = 0;
    let failed = 0;

    while (true) {
      const result = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "Notification"
          WHERE "status" = 'PENDING'::"NotificationStatus"
            AND "scheduledFor" <= ${now}
          ORDER BY "scheduledFor" ASC, "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `;

        if (locked.length === 0) {
          return null;
        }

        const notification = await tx.notification.findUniqueOrThrow({
          where: { id: locked[0].id },
        });

        try {
          await this.provider.send({
            id: notification.id,
            type: notification.type,
            recipient: notification.recipient,
            payloadSnapshot: notification.payloadSnapshot,
          });
          await tx.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.SENT,
              sentAt: now,
            },
          });
          return NotificationStatus.SENT;
        } catch (error) {
          await tx.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.FAILED,
              failedAt: now,
              failureReason: this.getFailureReason(error),
            },
          });
          return NotificationStatus.FAILED;
        }
      });

      if (!result) {
        return { sent, failed };
      }
      if (result === NotificationStatus.SENT) {
        sent += 1;
      } else {
        failed += 1;
      }
    }
  }

  private createReminderIfDue(
    tx: Prisma.TransactionClient,
    booking: BookingWithItems,
    now: Date,
  ) {
    const scheduledFor = new Date(
      this.getAppointmentTime(booking).getTime() - 24 * 60 * 60 * 1000,
    );

    if (scheduledFor < now) {
      return Promise.resolve();
    }

    return this.create(
      tx,
      booking,
      NotificationType.BOOKING_REMINDER,
      scheduledFor,
    );
  }

  private create(
    tx: Prisma.TransactionClient,
    booking: BookingWithItems,
    type: NotificationType,
    scheduledFor: Date,
  ) {
    return tx.notification.create({
      data: {
        ownerId: booking.ownerId,
        bookingId: booking.id,
        type,
        channel: NotificationChannel.EMAIL,
        recipient: booking.customerEmail!,
        scheduledFor,
        payloadSnapshot: {
          customerName: booking.customerName,
          bookingDate: formatCalendarDate(booking.bookingDate),
          startMinutes: booking.startMinutes,
          serviceTitles: booking.items
            .filter((item) => item.type === 'SERVICE')
            .map((item) => item.title),
          items: booking.items.map((item) => ({
            title: item.title,
            type: item.type,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotalAmount: item.lineTotalAmount,
            durationMinutes: item.durationMinutes,
          })),
          totalAmount: booking.totalAmount,
        },
      },
    });
  }

  private cancelPendingReminders(
    tx: Prisma.TransactionClient,
    bookingId: string,
    now: Date,
  ) {
    return tx.notification.updateMany({
      where: {
        bookingId,
        type: NotificationType.BOOKING_REMINDER,
        status: NotificationStatus.PENDING,
      },
      data: {
        status: NotificationStatus.CANCELLED,
        cancelledAt: now,
      },
    });
  }

  private getAppointmentTime(booking: Booking) {
    return new Date(
      Date.UTC(
        booking.bookingDate.getUTCFullYear(),
        booking.bookingDate.getUTCMonth(),
        booking.bookingDate.getUTCDate(),
        0,
        booking.startMinutes,
      ),
    );
  }

  private getFailureReason(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown delivery failure';
  }
}
