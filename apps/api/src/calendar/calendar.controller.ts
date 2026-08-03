import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { CalendarService } from './calendar.service';
import { CreateCalendarDateOverrideDto } from './dto/create-calendar-date-override.dto';
import { CreateOfficialCalendarDayDto } from './dto/create-official-calendar-day.dto';
import { UpdateCalendarDateOverrideDto } from './dto/update-calendar-date-override.dto';
import { UpdateOfficialCalendarDayDto } from './dto/update-official-calendar-day.dto';
import { WeeklyWorkingHoursDto } from './dto/weekly-working-hours.dto';

@Controller('calendar')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('weekly')
  findWeeklyWorkingHours() {
    return this.calendarService.findWeeklyWorkingHours();
  }

  @Put('weekly/:dayOfWeek')
  upsertWeeklyWorkingHours(
    @Param('dayOfWeek', new ParseEnumPipe(DayOfWeek))
    dayOfWeek: DayOfWeek,
    @Body() dto: WeeklyWorkingHoursDto,
  ) {
    return this.calendarService.upsertWeeklyWorkingHours(dayOfWeek, dto);
  }

  @Get('official-days')
  findOfficialCalendarDays() {
    return this.calendarService.findOfficialCalendarDays();
  }

  @Post('official-days')
  createOfficialCalendarDay(@Body() dto: CreateOfficialCalendarDayDto) {
    return this.calendarService.createOfficialCalendarDay(dto);
  }

  @Patch('official-days/:id')
  updateOfficialCalendarDay(
    @Param('id') id: string,
    @Body() dto: UpdateOfficialCalendarDayDto,
  ) {
    return this.calendarService.updateOfficialCalendarDay(id, dto);
  }

  @Delete('official-days/:id')
  removeOfficialCalendarDay(@Param('id') id: string) {
    return this.calendarService.removeOfficialCalendarDay(id);
  }

  @Get('overrides')
  findCalendarDateOverrides() {
    return this.calendarService.findCalendarDateOverrides();
  }

  @Post('overrides')
  createCalendarDateOverride(@Body() dto: CreateCalendarDateOverrideDto) {
    return this.calendarService.createCalendarDateOverride(dto);
  }

  @Patch('overrides/:id')
  updateCalendarDateOverride(
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDateOverrideDto,
  ) {
    return this.calendarService.updateCalendarDateOverride(id, dto);
  }

  @Delete('overrides/:id')
  removeCalendarDateOverride(@Param('id') id: string) {
    return this.calendarService.removeCalendarDateOverride(id);
  }

  @Get('day/:date')
  resolveDay(@Param('date') date: string) {
    return this.calendarService.resolveDay(date);
  }
}
