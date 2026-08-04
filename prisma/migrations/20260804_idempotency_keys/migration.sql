-- Idempotency keys for financial write flows (payments, expenses, cash closings)
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key", "userId")
);

CREATE INDEX IF NOT EXISTS "idempotency_keys_userId_createdAt_idx" ON "idempotency_keys" ("userId", "createdAt");
