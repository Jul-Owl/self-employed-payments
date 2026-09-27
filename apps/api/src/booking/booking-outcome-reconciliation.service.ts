import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { businessDateToday } from './booking-time.helper';
import { BookingService } from './booking.service';

const BATCH_SIZE = 100;
const INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class BookingOutcomeReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingOutcomeReconciliationService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
  ) {}

  onModuleInit() {
    void this.reconcileDueBookings();
    this.timer = setInterval(() => void this.reconcileDueBookings(), INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcileDueBookings(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    try {
      const candidates = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          totalAmount: { gt: 0 },
          bookingDate: { lte: businessDateToday(now) },
        },
        select: { id: true },
        orderBy: [{ bookingDate: 'asc' }, { id: 'asc' }],
        take: BATCH_SIZE,
      });
      let reconciled = 0;
      for (const booking of candidates) {
        if (await this.bookingService.reconcilePaidBooking(booking.id, now)) reconciled += 1;
      }
      return reconciled;
    } catch (error) {
      this.logger.error('Booking outcome reconciliation failed', error instanceof Error ? error.stack : undefined);
      return 0;
    } finally {
      this.running = false;
    }
  }
}
