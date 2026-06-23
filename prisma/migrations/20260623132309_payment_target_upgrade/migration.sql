-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "method" TEXT,
ADD COLUMN     "originAccount" TEXT,
ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "targetBankId" INTEGER;

-- CreateTable
CREATE TABLE "PaymentTarget" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentTarget_tenantId_idx" ON "PaymentTarget"("tenantId");

-- AddForeignKey
ALTER TABLE "PaymentTarget" ADD CONSTRAINT "PaymentTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
