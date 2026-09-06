import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetRescheduleAvailabilityDto } from './dto/get-reschedule-availability.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Controller('bookings')
@UseGuards(AuthGuard)
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
  findAll(@Query() dto: ListBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.findAll(dto, user.id);
  }

  @Get(':id/availability')
  getRescheduleAvailability(
    @Param('id') id: string,
    @Query() dto: GetRescheduleAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.getRescheduleAvailability(id, dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.findOne(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.create(dto, user.id);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingService.reschedule(id, dto, user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.cancel(id, user.id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.complete(id, user.id);
  }
}
