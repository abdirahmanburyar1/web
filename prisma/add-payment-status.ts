/**
 * Add status column to payments (enum PENDING, PAID, PARTIAL, TRANSFERRED).
 * Run: npx tsx prisma/add-payment-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'TRANSFERRED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS status "PaymentStatus" DEFAULT 'PENDING';
  `);
  console.log("Column payments.status ensured.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
