import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TbankModule } from '../providers/tbank/tbank.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingOutcomeReconciliationService } from './booking-outcome-reconciliation.service';

@Module({
  imports: [
    PrismaModule,
    CalendarModule,
    AuthModule,
    NotificationsModule,
    TbankModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingOutcomeReconciliationService],
  exports: [BookingService],
})
export class BookingModule {}
