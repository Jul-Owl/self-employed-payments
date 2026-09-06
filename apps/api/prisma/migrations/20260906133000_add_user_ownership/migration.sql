CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "publicSlug" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_publicSlug_key" ON "User"("publicSlug");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

INSERT INTO "User" ("id", "email", "name", "publicSlug", "updatedAt")
VALUES (
    'legacy-dev-owner',
    'dev-owner@local.test',
    'Dev Owner',
    'dev-owner',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "WeeklyWorkingHours" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "CalendarDateOverride" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

UPDATE "WeeklyWorkingHours" SET "ownerId" = 'legacy-dev-owner';
UPDATE "CalendarDateOverride" SET "ownerId" = 'legacy-dev-owner';
UPDATE "CatalogItem" SET "ownerId" = 'legacy-dev-owner';
UPDATE "Booking" SET "ownerId" = 'legacy-dev-owner';
UPDATE "PaymentLink" SET "ownerId" = 'legacy-dev-owner';
UPDATE "Transaction" SET "ownerId" = 'legacy-dev-owner';

ALTER TABLE "WeeklyWorkingHours" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "CalendarDateOverride" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "CatalogItem" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "PaymentLink" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "ownerId" SET NOT NULL;

DROP INDEX "WeeklyWorkingHours_dayOfWeek_key";
DROP INDEX "CalendarDateOverride_date_key";

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyWorkingHours_ownerId_dayOfWeek_key"
ON "WeeklyWorkingHours"("ownerId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "WeeklyWorkingHours_ownerId_idx" ON "WeeklyWorkingHours"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarDateOverride_ownerId_date_key"
ON "CalendarDateOverride"("ownerId", "date");
CREATE INDEX IF NOT EXISTS "CalendarDateOverride_ownerId_idx" ON "CalendarDateOverride"("ownerId");
CREATE INDEX IF NOT EXISTS "CatalogItem_ownerId_idx" ON "CatalogItem"("ownerId");
CREATE INDEX IF NOT EXISTS "Booking_ownerId_idx" ON "Booking"("ownerId");
CREATE INDEX IF NOT EXISTS "PaymentLink_ownerId_idx" ON "PaymentLink"("ownerId");
CREATE INDEX IF NOT EXISTS "Transaction_ownerId_idx" ON "Transaction"("ownerId");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeeklyWorkingHours"
ADD CONSTRAINT "WeeklyWorkingHours_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CalendarDateOverride"
ADD CONSTRAINT "CalendarDateOverride_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CatalogItem"
ADD CONSTRAINT "CatalogItem_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentLink"
ADD CONSTRAINT "PaymentLink_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
