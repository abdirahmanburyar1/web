/**
 * Migration: Refine payments and payment_receipts.
 * - PaymentStatus: add PARTIALLY_PAID, REFUNDED; migrate PARTIAL -> PARTIALLY_PAID
 * - payments: add notes, createdAt, updatedAt
 * - payment_receipts: add tenantId, amount, payment_account, paid_at; remove amountReceived, account, issuedAt, paymentMethod
 * Run: npx tsx prisma/migrate-payments-receipts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Add new PaymentStatus enum values (PostgreSQL)
  await prisma.$executeRawUnsafe(`
    ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE payments SET status = 'PARTIALLY_PAID' WHERE status = 'PARTIAL';
  `);
  console.log('PaymentStatus enum updated.');

  // 2. payments: add notes, createdAt, updatedAt
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();
  `);
  console.log('payments columns added.');

  // 3. payment_receipts: add tenant_id (nullable first, backfill, then set not null)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE payment_receipts pr SET tenant_id = p.tenant_id
    FROM payments p WHERE pr.payment_id = p.id AND pr.tenant_id IS NULL;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ALTER COLUMN tenant_id SET NOT NULL;
  `).catch(() => {}); // may already be not null

  // Add amount (required), backfill from amount_received or payment.amount
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
  `);
  // Backfill amount from existing amountReceived column or payment.amount
  await prisma.$executeRawUnsafe(`
    UPDATE payment_receipts pr SET amount = COALESCE(pr."amountReceived", (SELECT p.amount FROM payments p WHERE p.id = pr.payment_id))
    WHERE pr.amount IS NULL;
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    UPDATE payment_receipts pr SET amount = (SELECT amount FROM payments p WHERE p.id = pr.payment_id)
    WHERE pr.amount IS NULL;
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ALTER COLUMN amount SET NOT NULL;
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ALTER COLUMN amount SET DEFAULT 0;
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS payment_account VARCHAR(255);
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE payment_receipts SET payment_account = "account" WHERE "account" IS NOT NULL AND payment_account IS NULL;
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NOT NULL DEFAULT now();
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE payment_receipts SET paid_at = "issuedAt" WHERE "issuedAt" IS NOT NULL;
  `).catch(() => {});

  // Drop old columns (Prisma default camelCase in DB: amountReceived, issuedAt, account, paymentMethod)
  for (const col of ['"amountReceived"', '"issuedAt"', '"account"', '"paymentMethod"']) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE payment_receipts DROP COLUMN IF EXISTS ${col};
    `).catch(() => {});
  }
  console.log('payment_receipts refined (tenant_id, amount, payment_account, paid_at).');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
