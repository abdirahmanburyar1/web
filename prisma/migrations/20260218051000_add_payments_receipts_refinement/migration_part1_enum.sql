-- Part 1: Add enum values only (must be committed before use in PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'PARTIALLY_PAID') THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_PAID';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'REFUNDED') THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
  END IF;
END $$;
