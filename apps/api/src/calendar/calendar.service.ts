import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CalendarDateOverride,
  CalendarDateOverrideType,
  DayOfWeek,
  OfficialCalendarDay,
  OfficialCalendarDayType,
  Prisma,
  WeeklyWorkingHours,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatCalendarDate,
  parseCalendarDate,
} from './calendar-date.helper';
import { CreateCalendarDateOverrideDto } from './dto/create-calendar-date-override.dto';
import { CreateOfficialCalendarDayDto } from './dto/create-official-calendar-day.dto';
import { UpdateCalendarDateOverrideDto } from './dto/update-calendar-date-override.dto';
import { UpdateOfficialCalendarDayDto } from './dto/update-official-calendar-day.dto';
import { WeeklyWorkingHoursDto } from './dto/weekly-working-hours.dto';

interface WorkingIntervalInput {
  isWorking: boolean;
  startMinutes: number | null;
  endMinutes: number | null;
}

interface OverrideInput {
  type: CalendarDateOverrideType;
  startMinutes: number | null;
  endMinutes: number | null;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findWeeklyWorkingHours(ownerId: string) {
    const records = await this.prisma.weeklyWorkingHours.findMany({
      where: { ownerId },
    });

    return records.sort(
      (left, right) =>
        this.dayOfWeekIndex(left.dayOfWeek) - this.dayOfWeekIndex(right.dayOfWeek),
    );
  }

  async upsertWeeklyWorkingHours(
    dayOfWeek: DayOfWeek,
    dto: WeeklyWorkingHoursDto,
    ownerId: string,
  ) {
    const data = this.normalizeWorkingInterval({
      isWorking: dto.isWorking,
      startMinutes: dto.startMinutes ?? null,
      endMinutes: dto.endMinutes ?? null,
    });

    return this.prisma.weeklyWorkingHours.upsert({
      where: { ownerId_dayOfWeek: { ownerId, dayOfWeek } },
      create: {
        ownerId,
        dayOfWeek,
        ...data,
      },
      update: data,
    });
  }

  async findOfficialCalendarDays() {
    const records = await this.prisma.officialCalendarDay.findMany({
      orderBy: { date: 'asc' },
    });

    return records.map((record) => this.serializeOfficialCalendarDay(record));
  }

  async createOfficialCalendarDay(dto: CreateOfficialCalendarDayDto) {
    const date = parseCalendarDate(dto.date);
    const record = await this.withUniqueConstraint(
      () =>
        this.prisma.officialCalendarDay.create({
          data: {
            date,
            type: dto.type,
          },
        }),
      'An official calendar day already exists for this date',
    );

    return this.serializeOfficialCalendarDay(record);
  }

  async updateOfficialCalendarDay(
    id: string,
    dto: UpdateOfficialCalendarDayDto,
  ) {
    const existing = await this.findOfficialCalendarDay(id);
    const record = await this.withUniqueConstraint(
      () =>
        this.prisma.officialCalendarDay.update({
          where: { id },
          data: {
            date: dto.date === undefined ? existing.date : parseCalendarDate(dto.date),
            type: dto.type ?? existing.type,
          },
        }),
      'An official calendar day already exists for this date',
    );

    return this.serializeOfficialCalendarDay(record);
  }

  async removeOfficialCalendarDay(id: string) {
    await this.findOfficialCalendarDay(id);
    const record = await this.prisma.officialCalendarDay.delete({
      where: { id },
    });

    return this.serializeOfficialCalendarDay(record);
  }

  async findCalendarDateOverrides(ownerId: string) {
    const records = await this.prisma.calendarDateOverride.findMany({
      where: { ownerId },
      orderBy: { date: 'asc' },
    });

    return records.map((record) => this.serializeCalendarDateOverride(record));
  }

  async createCalendarDateOverride(
    dto: CreateCalendarDateOverrideDto,
    ownerId: string,
  ) {
    const data = this.normalizeOverride({
      type: dto.type,
      startMinutes: dto.startMinutes ?? null,
      endMinutes: dto.endMinutes ?? null,
    });
    const record = await this.withUniqueConstraint(
      () =>
        this.prisma.calendarDateOverride.create({
          data: {
            ownerId,
            date: parseCalendarDate(dto.date),
            ...data,
            reason: dto.reason ?? null,
          },
        }),
      'A calendar date override already exists for this date',
    );

    return this.serializeCalendarDateOverride(record);
  }

  async updateCalendarDateOverride(
    id: string,
    dto: UpdateCalendarDateOverrideDto,
    ownerId: string,
  ) {
    const existing = await this.findCalendarDateOverride(id, ownerId);
    const data = this.normalizeOverride({
      type: dto.type ?? existing.type,
      startMinutes:
        dto.startMinutes === undefined
          ? existing.startMinutes
          : dto.startMinutes,
      endMinutes:
        dto.endMinutes === undefined ? existing.endMinutes : dto.endMinutes,
    });
    const record = await this.withUniqueConstraint(
      () =>
        this.prisma.calendarDateOverride.update({
          where: { id },
          data: {
            date: dto.date === undefined ? existing.date : parseCalendarDate(dto.date),
            ...data,
            reason: dto.reason === undefined ? existing.reason : dto.reason,
          },
        }),
      'A calendar date override already exists for this date',
    );

    return this.serializeCalendarDateOverride(record);
  }

  async removeCalendarDateOverride(id: string, ownerId: string) {
    await this.findCalendarDateOverride(id, ownerId);
    const record = await this.prisma.calendarDateOverride.delete({
      where: { id },
    });

    return this.serializeCalendarDateOverride(record);
  }

  async resolveDay(dateValue: string, ownerId: string) {
    return this.resolveDayForClient(this.prisma, dateValue, ownerId);
  }

  async resolveDayInTransaction(
    tx: Prisma.TransactionClient,
    dateValue: string,
    ownerId: string,
  ) {
    return this.resolveDayForClient(tx, dateValue, ownerId);
  }

  private async resolveDayForClient(
    client: Prisma.TransactionClient | PrismaService,
    dateValue: string,
    ownerId: string,
  ) {
    const date = parseCalendarDate(dateValue);
    const [override, officialCalendarDay, weeklyWorkingHours] =
      await Promise.all([
        client.calendarDateOverride.findUnique({
          where: { ownerId_date: { ownerId, date } },
        }),
        client.officialCalendarDay.findUnique({ where: { date } }),
        client.weeklyWorkingHours.findUnique({
          where: {
            ownerId_dayOfWeek: {
              ownerId,
              dayOfWeek: this.dayOfWeekForDate(date),
            },
          },
        }),
      ]);

    if (override) {
      return {
        date: formatCalendarDate(date),
        isWorking: override.type === CalendarDateOverrideType.OPEN,
        startMinutes: override.startMinutes,
        endMinutes: override.endMinutes,
        resolvedBy: 'OVERRIDE',
        resolvedRule:
          override.type === CalendarDateOverrideType.OPEN ? 'OPEN' : 'CLOSED',
      };
    }

    if (officialCalendarDay?.type === OfficialCalendarDayType.HOLIDAY) {
      return {
        date: formatCalendarDate(date),
        isWorking: false,
        startMinutes: null,
        endMinutes: null,
        resolvedBy: 'OFFICIAL_CALENDAR',
        resolvedRule: 'HOLIDAY',
      };
    }

    const weeklyResolution = this.resolveWeeklyWorkingHours(
      date,
      weeklyWorkingHours,
    );

    if (officialCalendarDay?.type === OfficialCalendarDayType.WORKING_DAY) {
      return {
        ...weeklyResolution,
        resolvedBy: 'OFFICIAL_CALENDAR',
        resolvedRule: 'WORKING_DAY',
      };
    }

    return weeklyResolution;
  }

  private async findOfficialCalendarDay(id: string) {
    const record = await this.prisma.officialCalendarDay.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(
        `OfficialCalendarDay with id "${id}" was not found`,
      );
    }

    return record;
  }

  private async findCalendarDateOverride(id: string, ownerId: string) {
    const record = await this.prisma.calendarDateOverride.findFirst({
      where: { id, ownerId },
    });

    if (!record) {
      throw new NotFoundException(
        `CalendarDateOverride with id "${id}" was not found`,
      );
    }

    return record;
  }

  private normalizeWorkingInterval(input: WorkingIntervalInput) {
    if (!input.isWorking) {
      return {
        isWorking: false,
        startMinutes: null,
        endMinutes: null,
      };
    }

    this.validateMinutes(input.startMinutes, input.endMinutes);

    return input;
  }

  private normalizeOverride(input: OverrideInput) {
    if (input.type === CalendarDateOverrideType.CLOSED) {
      return {
        type: CalendarDateOverrideType.CLOSED,
        startMinutes: null,
        endMinutes: null,
      };
    }

    this.validateMinutes(input.startMinutes, input.endMinutes);

    return input;
  }

  private validateMinutes(
    startMinutes: number | null,
    endMinutes: number | null,
  ) {
    if (startMinutes === null || endMinutes === null) {
      throw new BadRequestException(
        'startMinutes and endMinutes are required for an open interval',
      );
    }

    if (
      startMinutes < 0 ||
      startMinutes > 1439 ||
      endMinutes < 0 ||
      endMinutes > 1439
    ) {
      throw new BadRequestException('minutes must be between 0 and 1439');
    }

    if (startMinutes >= endMinutes) {
      throw new BadRequestException(
        'startMinutes must be less than endMinutes',
      );
    }
  }

  private resolveWeeklyWorkingHours(
    date: Date,
    weeklyWorkingHours: WeeklyWorkingHours | null,
  ) {
    if (!weeklyWorkingHours?.isWorking) {
      return {
        date: formatCalendarDate(date),
        isWorking: false,
        startMinutes: null,
        endMinutes: null,
        resolvedBy: 'WEEKLY_SCHEDULE',
        resolvedRule: 'WEEKLY_CLOSED',
      };
    }

    return {
      date: formatCalendarDate(date),
      isWorking: true,
      startMinutes: weeklyWorkingHours.startMinutes,
      endMinutes: weeklyWorkingHours.endMinutes,
      resolvedBy: 'WEEKLY_SCHEDULE',
      resolvedRule: 'WEEKLY_WORKING',
    };
  }

  private serializeOfficialCalendarDay(record: OfficialCalendarDay) {
    return {
      ...record,
      date: formatCalendarDate(record.date),
    };
  }

  private serializeCalendarDateOverride(record: CalendarDateOverride) {
    return {
      ...record,
      date: formatCalendarDate(record.date),
    };
  }

  private dayOfWeekForDate(date: Date): DayOfWeek {
    const weekdays = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    return weekdays[date.getUTCDay()];
  }

  private dayOfWeekIndex(dayOfWeek: DayOfWeek) {
    return [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
      DayOfWeek.SUNDAY,
    ].indexOf(dayOfWeek);
  }

  private async withUniqueConstraint<T>(
    operation: () => Promise<T>,
    message: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(message);
      }

      throw error;
    }
  }
}
