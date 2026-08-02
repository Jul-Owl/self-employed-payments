-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('SERVICE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "CatalogItemUnit" AS ENUM ('PIECE', 'HOUR', 'MINUTE', 'DAY', 'SET');

-- CreateEnum
CREATE TYPE "CatalogItemPaymentPolicy" AS ENUM ('NO_PREPAYMENT', 'FIXED_PREPAYMENT', 'PERCENT_PREPAYMENT', 'FULL_PREPAYMENT');

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CatalogItemType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER,
    "durationMinutes" INTEGER,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "unit" "CatalogItemUnit",
    "paymentPolicy" "CatalogItemPaymentPolicy",
    "prepaymentValue" INTEGER,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);
