-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "paymentPreferenceId" TEXT,
ADD COLUMN "paymentInitPoint" TEXT,
ADD COLUMN "mercadoPagoPaymentId" TEXT,
ADD COLUMN "mercadoPagoMerchantOrderId" TEXT,
ADD COLUMN "paymentApprovedAt" TIMESTAMP(3),
ADD COLUMN "paymentUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentPreferenceId_key" ON "Order"("paymentPreferenceId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_mercadoPagoPaymentId_idx" ON "Order"("mercadoPagoPaymentId");
