import {
  CatalogItemPaymentPolicy,
  CatalogItemType,
  CatalogItemUnit,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCatalogItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(CatalogItemType)
  type!: CatalogItemType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferBeforeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number;

  @IsOptional()
  @IsEnum(CatalogItemUnit)
  unit?: CatalogItemUnit | null;

  @IsOptional()
  @IsEnum(CatalogItemPaymentPolicy)
  paymentPolicy?: CatalogItemPaymentPolicy | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepaymentValue?: number | null;

  @IsOptional()
  @IsString()
  category?: string | null;
}
