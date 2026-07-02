-- Add product package dimensions for real freight quotes.
ALTER TABLE "Product" ADD COLUMN "packageWeightInGrams" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "Product" ADD COLUMN "packageWidthCm" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Product" ADD COLUMN "packageHeightCm" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Product" ADD COLUMN "packageLengthCm" INTEGER NOT NULL DEFAULT 28;

-- Add shipment selection and tracking fields to orders.
ALTER TABLE "Order" ADD COLUMN "shippingProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingServiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingServiceName" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingCarrierName" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingDeliveryMinDays" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingDeliveryMaxDays" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingTrackingCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingTrackingUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelId" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingProtocol" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingPostedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippingDeliveredAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippingUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Order_shippingTrackingCode_idx" ON "Order"("shippingTrackingCode");
CREATE INDEX "Order_shippingLabelId_idx" ON "Order"("shippingLabelId");
CREATE INDEX "Order_shippingProtocol_idx" ON "Order"("shippingProtocol");
