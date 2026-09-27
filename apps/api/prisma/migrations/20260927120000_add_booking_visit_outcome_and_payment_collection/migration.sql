-- NOTE: This migration is prepared but intentionally not applied locally.
-- The repository has known historical migration drift; use the normal Prisma
-- workflow only after that unrelated state is resolved.

ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

ALTER TABLE "Booking" ADD COLUMN "noShowAt" TIMESTAMP(3);

ALTER TABLE "Booking" DROP CONSTRAINT "Booking_paymentId_fkey";
DROP INDEX "Booking_paymentId_key";
ALTER TABLE "Booking" DROP COLUMN "paymentId";

ALTER TABLE "Payment" ADD COLUMN "bookingId" TEXT;
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
