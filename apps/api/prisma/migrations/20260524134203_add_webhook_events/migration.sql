-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "externalPaymentId" TEXT,
ADD COLUMN     "externalStatus" TEXT;

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT,
    "externalPaymentId" TEXT,
    "idempotencyKey" TEXT,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "WebhookEvent_externalPaymentId_idx" ON "WebhookEvent"("externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_idempotencyKey_key" ON "WebhookEvent"("provider", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Transaction_externalPaymentId_idx" ON "Transaction"("externalPaymentId");
