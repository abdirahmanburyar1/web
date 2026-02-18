-- Make Payment.method optional: account is per-receipt, so do not default to CASH when creating payments (e.g. from meter reading).
ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "method" DROP NOT NULL;
