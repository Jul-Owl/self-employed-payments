import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Controller('bookings')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll(@Query() dto: ListBookingsDto) {
    return this.bookingService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.reschedule(id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookingService.cancel(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.bookingService.complete(id);
  }
}
