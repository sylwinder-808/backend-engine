-- CreateTable
CREATE TABLE "ContactSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "email" TEXT,
    "livechatUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactSetting_tenantId_key" ON "ContactSetting"("tenantId");

-- AddForeignKey
ALTER TABLE "ContactSetting" ADD CONSTRAINT "ContactSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
