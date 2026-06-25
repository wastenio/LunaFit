ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CustomerAuthToken" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "pendingPasswordHash" TEXT,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAuthToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomerAuthToken_tokenHash_key"
  ON "CustomerAuthToken"("tokenHash");
CREATE INDEX "CustomerAuthToken_userId_type_createdAt_idx"
  ON "CustomerAuthToken"("userId", "type", "createdAt");
CREATE INDEX "CustomerAuthToken_expiresAt_idx"
  ON "CustomerAuthToken"("expiresAt");
