/*
  Warnings:

  - You are about to drop the column `amount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `grossAmount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `netAmount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxAmount` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
DROP COLUMN "tax",
ADD COLUMN     "grossAmount" INTEGER NOT NULL,
ADD COLUMN     "netAmount" INTEGER NOT NULL,
ADD COLUMN     "taxAmount" INTEGER NOT NULL;
