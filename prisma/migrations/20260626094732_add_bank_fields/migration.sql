/*
  Warnings:

  - The primary key for the `PaymentTarget` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `code` to the `PaymentTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `PaymentTarget` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PaymentTarget" DROP CONSTRAINT "PaymentTarget_tenantId_fkey";

-- AlterTable
ALTER TABLE "PaymentTarget" DROP CONSTRAINT "PaymentTarget_pkey",
ADD COLUMN     "adminFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "qrImage" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "PaymentTarget_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PaymentTarget_id_seq";

-- AddForeignKey
ALTER TABLE "PaymentTarget" ADD CONSTRAINT "PaymentTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
