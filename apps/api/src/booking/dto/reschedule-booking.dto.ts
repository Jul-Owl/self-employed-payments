import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class RescheduleBookingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  bookingDate!: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinutes!: number;
}
