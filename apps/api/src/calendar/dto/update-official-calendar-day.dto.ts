import { PartialType } from '@nestjs/mapped-types';
import { CreateOfficialCalendarDayDto } from './create-official-calendar-day.dto';

export class UpdateOfficialCalendarDayDto extends PartialType(
  CreateOfficialCalendarDayDto,
) {}
