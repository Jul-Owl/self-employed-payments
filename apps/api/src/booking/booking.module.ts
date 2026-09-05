import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [PrismaModule, CalendarModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
