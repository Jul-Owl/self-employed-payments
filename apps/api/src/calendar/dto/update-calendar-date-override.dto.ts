import { PartialType } from '@nestjs/mapped-types';
import { CreateCalendarDateOverrideDto } from './create-calendar-date-override.dto';

export class UpdateCalendarDateOverrideDto extends PartialType(
  CreateCalendarDateOverrideDto,
) {}
