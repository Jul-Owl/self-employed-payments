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
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
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
  @UseGuards(AuthGuard)
  findWeeklyWorkingHours(@CurrentUser() user: AuthenticatedUser) {
    return this.calendarService.findWeeklyWorkingHours(user.id);
  }

  @Put('weekly/:dayOfWeek')
  @UseGuards(AuthGuard)
  upsertWeeklyWorkingHours(
    @Param('dayOfWeek', new ParseEnumPipe(DayOfWeek))
    dayOfWeek: DayOfWeek,
    @Body() dto: WeeklyWorkingHoursDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.upsertWeeklyWorkingHours(dayOfWeek, dto, user.id);
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
  @UseGuards(AuthGuard)
  findCalendarDateOverrides(@CurrentUser() user: AuthenticatedUser) {
    return this.calendarService.findCalendarDateOverrides(user.id);
  }

  @Post('overrides')
  @UseGuards(AuthGuard)
  createCalendarDateOverride(
    @Body() dto: CreateCalendarDateOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.createCalendarDateOverride(dto, user.id);
  }

  @Patch('overrides/:id')
  @UseGuards(AuthGuard)
  updateCalendarDateOverride(
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDateOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.updateCalendarDateOverride(id, dto, user.id);
  }

  @Delete('overrides/:id')
  @UseGuards(AuthGuard)
  removeCalendarDateOverride(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calendarService.removeCalendarDateOverride(id, user.id);
  }

  @Get('day/:date')
  @UseGuards(AuthGuard)
  resolveDay(@Param('date') date: string, @CurrentUser() user: AuthenticatedUser) {
    return this.calendarService.resolveDay(date, user.id);
  }
}
