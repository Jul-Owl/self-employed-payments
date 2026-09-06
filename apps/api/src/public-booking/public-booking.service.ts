import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service';
import { GetAvailabilityDto } from '../availability/dto/get-availability.dto';
import { BookingService } from '../booking/booking.service';
import { CreateBookingDto } from '../booking/dto/create-booking.dto';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly availabilityService: AvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  async findBookableServices(slug: string) {
    return this.catalogService.findBookableServices(
      await this.resolveOwnerId(slug),
    );
  }

  async getAvailability(slug: string, dto: GetAvailabilityDto) {
    return this.availabilityService.getAvailability(
      dto,
      await this.resolveOwnerId(slug),
    );
  }

  async createBooking(slug: string, dto: CreateBookingDto) {
    const ownerId = await this.resolveOwnerId(slug);

    if (
      dto.items.some(
        (item) =>
          item.unitPrice !== undefined || item.durationMinutes !== undefined,
      )
    ) {
      throw new BadRequestException(
        'Public bookings cannot override CatalogItem price or duration',
      );
    }

    return this.bookingService.create(dto, ownerId);
  }

  private async resolveOwnerId(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { publicSlug: slug },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(
        `Public profile with slug "${slug}" was not found`,
      );
    }

    return user.id;
  }
}
