-- NOTE: This migration is PREPARED but NOT YET APPLIED to any database.
-- It was generated via `prisma migrate diff` (read-only introspection) because
-- `prisma migrate dev` is currently blocked by a pre-existing local dev DB
-- history drift on migration `20260906133000_add_user_ownership` (unrelated to
-- this change; caused by leftover rolled-back rows in `_prisma_migrations`).
-- Apply this migration only after that drift issue is resolved, using the
-- project's normal `prisma migrate dev` workflow (do not hand-apply via
-- `prisma db execute` or mark it resolved manually).

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_paymentLinkId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "requiredPaymentAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BookingItem" ADD COLUMN     "paymentPolicy" "CatalogItemPaymentPolicy",
ADD COLUMN     "prepaymentValue" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "paymentLinkId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentId_key" ON "Booking"("paymentId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
