/**
 * Clear tenant operational data: payment receipts, payments, invoices,
 * meter readings, and meters. Does not remove tenants, users, or platform data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete in order of dependencies (child → parent)
  const receipts = await prisma.paymentReceipt.deleteMany({});
  console.log(`Deleted ${receipts.count} payment receipt(s).`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${payments.count} payment(s).`);

  const invoices = await prisma.invoice.deleteMany({});
  console.log(`Deleted ${invoices.count} invoice(s).`);

  const readings = await prisma.meterReading.deleteMany({});
  console.log(`Deleted ${readings.count} meter reading(s).`);

  const meters = await prisma.meter.deleteMany({});
  console.log(`Deleted ${meters.count} meter(s).`);

  console.log("Done. Meters, payments, readings, and receipts cleared.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
