/**
 * One-off: add `account` column to payment_receipts if missing.
 * Run: npx tsx prisma/add-receipt-account.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts
    ADD COLUMN IF NOT EXISTS account TEXT;
  `);
  console.log('Column payment_receipts.account ensured.');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payment_receipts
    ADD COLUMN IF NOT EXISTS "receivedById" TEXT REFERENCES users(id);
  `);
  console.log('Column payment_receipts.receivedById ensured.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
