PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Order" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "number" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "subtotalInCents" INTEGER NOT NULL,
  "shippingInCents" INTEGER NOT NULL DEFAULT 0,
  "totalInCents" INTEGER NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "addressNumber" TEXT NOT NULL,
  "addressComplement" TEXT,
  "neighborhood" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Order" (
  "id",
  "number",
  "userId",
  "status",
  "subtotalInCents",
  "shippingInCents",
  "totalInCents",
  "customerName",
  "customerEmail",
  "phone",
  "postalCode",
  "addressLine",
  "addressNumber",
  "addressComplement",
  "neighborhood",
  "city",
  "state",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "number",
  "userId",
  "status",
  "subtotalInCents",
  "shippingInCents",
  "totalInCents",
  "customerName",
  "customerEmail",
  "phone",
  "postalCode",
  "addressLine",
  "addressNumber",
  "addressComplement",
  "neighborhood",
  "city",
  "state",
  "notes",
  "createdAt",
  "updatedAt"
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

CREATE TABLE "OrderStatusEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx"
  ON "OrderStatusEvent"("orderId", "createdAt");

CREATE TABLE "CustomerNotification" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" TEXT NOT NULL,
  "orderId" INTEGER,
  "type" TEXT NOT NULL DEFAULT 'ORDER_STATUS',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerNotification_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CustomerNotification_userId_readAt_createdAt_idx"
  ON "CustomerNotification"("userId", "readAt", "createdAt");

INSERT INTO "OrderStatusEvent" (
  "orderId",
  "status",
  "title",
  "message",
  "createdAt"
)
SELECT
  "id",
  "status",
  'Status atual do pedido',
  'Status registrado antes da ativacao do acompanhamento detalhado.',
  "createdAt"
FROM "Order";

PRAGMA foreign_keys=ON;
