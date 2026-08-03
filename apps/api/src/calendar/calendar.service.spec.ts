import { BadRequestException } from '@nestjs/common';
import {
  CalendarDateOverrideType,
  DayOfWeek,
  OfficialCalendarDayType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const weeklyWorkingHours = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  };
  const officialCalendarDay = {
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const calendarDateOverride = {
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    weeklyWorkingHours,
    officialCalendarDay,
    calendarDateOverride,
  } as unknown as PrismaService;
  const service = new CalendarService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a working weekly interval', async () => {
    await service.upsertWeeklyWorkingHours(DayOfWeek.MONDAY, {
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });

    expect(weeklyWorkingHours.upsert).toHaveBeenCalledWith({
      where: { dayOfWeek: DayOfWeek.MONDAY },
      create: {
        dayOfWeek: DayOfWeek.MONDAY,
        isWorking: true,
        startMinutes: 540,
        endMinutes: 1080,
      },
      update: {
        isWorking: true,
        startMinutes: 540,
        endMinutes: 1080,
      },
    });
  });

  it('clears weekly hours for a non-working day', async () => {
    await service.upsertWeeklyWorkingHours(DayOfWeek.SUNDAY, {
      isWorking: false,
      startMinutes: 540,
      endMinutes: 1080,
    });

    expect(weeklyWorkingHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          isWorking: false,
          startMinutes: null,
          endMinutes: null,
        },
      }),
    );
  });

  it.each([
    { startMinutes: -1, endMinutes: 600 },
    { startMinutes: 0, endMinutes: 1440 },
  ])('rejects minutes outside the allowed range', async (interval) => {
    await expect(
      service.upsertWeeklyWorkingHours(DayOfWeek.MONDAY, {
        isWorking: true,
        ...interval,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a weekly interval with startMinutes greater than or equal to endMinutes', async () => {
    await expect(
      service.upsertWeeklyWorkingHours(DayOfWeek.MONDAY, {
        isWorking: true,
        startMinutes: 600,
        endMinutes: 600,
      }),
    ).rejects.toThrow('startMinutes must be less than endMinutes');
  });

  it('rejects OPEN override without hours', async () => {
    await expect(
      service.createCalendarDateOverride({
        date: '2026-08-10',
        type: CalendarDateOverrideType.OPEN,
      }),
    ).rejects.toThrow('startMinutes and endMinutes are required');
  });

  it('clears hours for a CLOSED override', async () => {
    calendarDateOverride.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'override-id',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await service.createCalendarDateOverride({
      date: '2026-08-10',
      type: CalendarDateOverrideType.CLOSED,
      startMinutes: 540,
      endMinutes: 1080,
    });

    expect(calendarDateOverride.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: CalendarDateOverrideType.CLOSED,
        startMinutes: null,
        endMinutes: null,
      }),
    });
  });

  it('HOLIDAY closes a working weekly day', async () => {
    calendarDateOverride.findUnique.mockResolvedValue(null);
    officialCalendarDay.findUnique.mockResolvedValue({
      type: OfficialCalendarDayType.HOLIDAY,
    });
    weeklyWorkingHours.findUnique.mockResolvedValue({
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });

    await expect(service.resolveDay('2026-08-10')).resolves.toEqual({
      date: '2026-08-10',
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
      resolvedBy: 'OFFICIAL_CALENDAR',
      resolvedRule: 'HOLIDAY',
    });
  });

  it('OPEN override opens a holiday', async () => {
    calendarDateOverride.findUnique.mockResolvedValue({
      type: CalendarDateOverrideType.OPEN,
      startMinutes: 600,
      endMinutes: 900,
    });
    officialCalendarDay.findUnique.mockResolvedValue({
      type: OfficialCalendarDayType.HOLIDAY,
    });

    await expect(service.resolveDay('2026-08-10')).resolves.toEqual({
      date: '2026-08-10',
      isWorking: true,
      startMinutes: 600,
      endMinutes: 900,
      resolvedBy: 'OVERRIDE',
      resolvedRule: 'OPEN',
    });
  });

  it('CLOSED override closes a working day', async () => {
    calendarDateOverride.findUnique.mockResolvedValue({
      type: CalendarDateOverrideType.CLOSED,
      startMinutes: null,
      endMinutes: null,
    });
    officialCalendarDay.findUnique.mockResolvedValue(null);
    weeklyWorkingHours.findUnique.mockResolvedValue({
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });

    await expect(service.resolveDay('2026-08-10')).resolves.toEqual({
      date: '2026-08-10',
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
      resolvedBy: 'OVERRIDE',
      resolvedRule: 'CLOSED',
    });
  });

  it('WORKING_DAY applies a working weekly schedule', async () => {
    calendarDateOverride.findUnique.mockResolvedValue(null);
    officialCalendarDay.findUnique.mockResolvedValue({
      type: OfficialCalendarDayType.WORKING_DAY,
    });
    weeklyWorkingHours.findUnique.mockResolvedValue({
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });

    await expect(service.resolveDay('2026-08-10')).resolves.toEqual({
      date: '2026-08-10',
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
      resolvedBy: 'OFFICIAL_CALENDAR',
      resolvedRule: 'WORKING_DAY',
    });
  });

  it('WORKING_DAY does not open a weekly day off', async () => {
    calendarDateOverride.findUnique.mockResolvedValue(null);
    officialCalendarDay.findUnique.mockResolvedValue({
      type: OfficialCalendarDayType.WORKING_DAY,
    });
    weeklyWorkingHours.findUnique.mockResolvedValue({
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
    });

    await expect(service.resolveDay('2026-08-09')).resolves.toEqual({
      date: '2026-08-09',
      isWorking: false,
      startMinutes: null,
      endMinutes: null,
      resolvedBy: 'OFFICIAL_CALENDAR',
      resolvedRule: 'WORKING_DAY',
    });
  });

  it('gives override priority over the official calendar', async () => {
    calendarDateOverride.findUnique.mockResolvedValue({
      type: CalendarDateOverrideType.CLOSED,
      startMinutes: null,
      endMinutes: null,
    });
    officialCalendarDay.findUnique.mockResolvedValue({
      type: OfficialCalendarDayType.WORKING_DAY,
    });
    weeklyWorkingHours.findUnique.mockResolvedValue({
      isWorking: true,
      startMinutes: 540,
      endMinutes: 1080,
    });

    await expect(service.resolveDay('2026-08-10')).resolves.toEqual(
      expect.objectContaining({
        isWorking: false,
        resolvedBy: 'OVERRIDE',
        resolvedRule: 'CLOSED',
      }),
    );
  });
});
