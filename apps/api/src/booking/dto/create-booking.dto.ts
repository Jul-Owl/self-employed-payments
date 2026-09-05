import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingItemDto {
  @IsString()
  @IsNotEmpty()
  catalogItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class CreateBookingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  bookingDate!: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinutes!: number;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  @ArrayMinSize(1)
  items!: CreateBookingItemDto[];
}
