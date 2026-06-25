CREATE TABLE "AnalyticsEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "type" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT,
  "path" TEXT,
  "source" TEXT,
  "medium" TEXT,
  "campaign" TEXT,
  "productId" INTEGER,
  "orderId" INTEGER,
  "valueInCents" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AnalyticsEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AnalyticsEvent_type_createdAt_idx"
  ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx"
  ON "AnalyticsEvent"("visitorId", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx"
  ON "AnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "AnalyticsEvent_path_createdAt_idx"
  ON "AnalyticsEvent"("path", "createdAt");
CREATE INDEX "AnalyticsEvent_productId_createdAt_idx"
  ON "AnalyticsEvent"("productId", "createdAt");
CREATE INDEX "AnalyticsEvent_orderId_idx"
  ON "AnalyticsEvent"("orderId");
