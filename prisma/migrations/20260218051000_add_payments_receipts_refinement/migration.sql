-- Payments: add notes, createdAt, updatedAt
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- (Enum values added in migration_part1_enum.sql - run that first, then this file)
UPDATE "payments" SET status = 'PARTIALLY_PAID' WHERE status = 'PARTIAL';

-- Payments: add indexes for status and recordedAt (if not exist)
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_recordedAt_idx" ON "payments"("recordedAt");

-- payment_receipts: add new columns (Prisma uses camelCase: tenantId; tenants.id is TEXT)
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT REFERENCES "tenants"("id") ON DELETE CASCADE;
UPDATE "payment_receipts" pr SET "tenantId" = p."tenantId" FROM "payments" p WHERE pr."paymentId" = p.id AND pr."tenantId" IS NULL;
ALTER TABLE "payment_receipts" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2);

-- Backfill amount (from old amountReceived if column exists, else from payment)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'amountReceived') THEN
    UPDATE "payment_receipts" pr SET amount = COALESCE(pr."amountReceived", (SELECT p.amount FROM "payments" p WHERE p.id = pr."paymentId")) WHERE pr.amount IS NULL;
  ELSE
    UPDATE "payment_receipts" pr SET amount = (SELECT p.amount FROM "payments" p WHERE p.id = pr."paymentId") WHERE pr.amount IS NULL;
  END IF;
END $$;

UPDATE "payment_receipts" pr SET amount = (SELECT amount FROM "payments" p WHERE p.id = pr."paymentId") WHERE pr.amount IS NULL;
-- Set default for new rows, then set NOT NULL (safe if table empty or all backfilled)
ALTER TABLE "payment_receipts" ALTER COLUMN "amount" SET DEFAULT 0;
UPDATE "payment_receipts" SET amount = 0 WHERE amount IS NULL;
ALTER TABLE "payment_receipts" ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "payment_account" VARCHAR(255);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'account') THEN
    UPDATE "payment_receipts" SET payment_account = "account"::VARCHAR(255) WHERE payment_account IS NULL AND "account" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'issuedAt') THEN
    UPDATE "payment_receipts" SET paid_at = "issuedAt" WHERE "issuedAt" IS NOT NULL;
  END IF;
END $$;

-- Drop old receipt columns if they exist (Prisma camelCase in DB)
ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "amountReceived";
ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "issuedAt";
ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "account";
ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "paymentMethod";

-- Indexes for payment_receipts
CREATE INDEX IF NOT EXISTS "payment_receipts_tenantId_idx" ON "payment_receipts"("tenantId");
CREATE INDEX IF NOT EXISTS "payment_receipts_paid_at_idx" ON "payment_receipts"("paid_at");
