-- Add meter fields for customer email, notes, location type, last reading, next reading due, and geo
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "customer_email" TEXT;
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "location_type" VARCHAR(255);
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "last_reading_value" DECIMAL(12,4);
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "last_reading_date" TIMESTAMPTZ;
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "next_reading_due_date" TIMESTAMPTZ;
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7);
ALTER TABLE "meters" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
