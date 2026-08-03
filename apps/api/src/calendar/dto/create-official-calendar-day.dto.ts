import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { OfficialCalendarDayType } from '@prisma/client';

export class CreateOfficialCalendarDayDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsEnum(OfficialCalendarDayType)
  type!: OfficialCalendarDayType;
}
