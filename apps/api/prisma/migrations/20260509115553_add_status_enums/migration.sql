/*
  Warnings:

  - The `status` column on the `PaymentLink` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Receipt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('RECEIVED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED');

-- AlterTable
ALTER TABLE "PaymentLink" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentLinkStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "status",
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'RECEIVED';
