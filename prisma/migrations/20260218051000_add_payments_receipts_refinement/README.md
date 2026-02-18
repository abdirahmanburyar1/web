# Migration: Payments & receipts refinement

This migration adds the updated payments and payment_receipts schema.

## If using `prisma migrate deploy` (empty DB or after baseline)

1. Baseline an existing DB first if needed: https://pris.ly/d/migrate-baseline
2. Run: `npx prisma migrate deploy`

## If running SQL manually (existing DB with no migration history)

Run in order:

1. **Enum values first** (PostgreSQL requires commit before using new enum values):
   ```bash
   npx prisma db execute --schema=prisma/schema.prisma --file prisma/migrations/20260218051000_add_payments_receipts_refinement/migration_part1_enum.sql
   ```

2. **Main migration**:
   ```bash
   npx prisma db execute --schema=prisma/schema.prisma --file prisma/migrations/20260218051000_add_payments_receipts_refinement/migration.sql
   ```

## Changes applied

- **payments**: `notes`, `createdAt`, `updatedAt`; indexes on `status`, `recordedAt`
- **PaymentStatus**: values `PARTIALLY_PAID`, `REFUNDED`; existing `PARTIAL` → `PARTIALLY_PAID`
- **payment_receipts**: `tenantId`, `amount`, `payment_account`, `paid_at`; backfill from old columns; drop `amountReceived`, `issuedAt`, `account`, `paymentMethod`
