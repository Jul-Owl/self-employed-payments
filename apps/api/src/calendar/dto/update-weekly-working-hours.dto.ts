import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsEnum, ValidateNested } from 'class-validator';
import { DayOfWeek } from '@prisma/client';
import { WeeklyWorkingHoursDto } from './weekly-working-hours.dto';

class WeeklyWorkingHoursDayDto extends WeeklyWorkingHoursDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;
}

export class UpdateWeeklyWorkingHoursDto {
  @ValidateNested({ each: true })
  @Type(() => WeeklyWorkingHoursDayDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days!: WeeklyWorkingHoursDayDto[];
}
