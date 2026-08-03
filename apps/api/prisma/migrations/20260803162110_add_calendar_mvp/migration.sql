-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "OfficialCalendarDayType" AS ENUM ('HOLIDAY', 'WORKING_DAY');

-- CreateEnum
CREATE TYPE "CalendarDateOverrideType" AS ENUM ('CLOSED', 'OPEN');

-- CreateTable
CREATE TABLE "WeeklyWorkingHours" (
    "id" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isWorking" BOOLEAN NOT NULL,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialCalendarDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "OfficialCalendarDayType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialCalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarDateOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "CalendarDateOverrideType" NOT NULL,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyWorkingHours_dayOfWeek_key" ON "WeeklyWorkingHours"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialCalendarDay_date_key" ON "OfficialCalendarDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDateOverride_date_key" ON "CalendarDateOverride"("date");
