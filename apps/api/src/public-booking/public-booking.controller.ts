import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GetAvailabilityDto } from '../availability/dto/get-availability.dto';
import { CreateBookingDto } from '../booking/dto/create-booking.dto';
import { PublicBookingService } from './public-booking.service';

@Controller('public/:slug')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('catalog')
  findBookableServices(@Param('slug') slug: string) {
    return this.publicBookingService.findBookableServices(slug);
  }

  @Get('availability')
  getAvailability(
    @Param('slug') slug: string,
    @Query() dto: GetAvailabilityDto,
  ) {
    return this.publicBookingService.getAvailability(slug, dto);
  }

  @Post('bookings')
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.publicBookingService.createBooking(slug, dto);
  }
}
