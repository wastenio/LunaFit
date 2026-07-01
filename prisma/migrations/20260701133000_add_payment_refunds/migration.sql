-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paymentRefundId" TEXT,
ADD COLUMN "paymentRefundStatus" TEXT,
ADD COLUMN "paymentRefundAmountInCents" INTEGER,
ADD COLUMN "paymentRefundedAt" TIMESTAMP(3),
ADD COLUMN "paymentRefundUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_paymentRefundId_idx" ON "Order"("paymentRefundId");
