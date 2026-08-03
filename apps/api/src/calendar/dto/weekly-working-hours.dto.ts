import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class WeeklyWorkingHoursDto {
  @IsBoolean()
  isWorking!: boolean;

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
}
