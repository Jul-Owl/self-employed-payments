import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CalendarDateOverrideType } from '@prisma/client';

export class CreateCalendarDateOverrideDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsEnum(CalendarDateOverrideType)
  type!: CalendarDateOverrideType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinutes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  endMinutes?: number | null;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
