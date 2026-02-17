/**
 * 1. Delete all current payments (receipts cascade).
 * 2. Generate one payment per existing meter for last month (each with no receipts).
 *
 * Optional env: TENANT_ID (single tenant slug or id); if unset, runs for all tenants.
 * Optional env: DEFAULT_AMOUNT (default 50).
 *
 * Run: npx tsx prisma/reset-payments-generate-last-month.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function lastMonthDate(): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastMonth = m === 0 ? new Date(y - 1, 11, 15) : new Date(y, m - 1, 15);
  return lastMonth;
}

async function main() {
  const tenantIdOrSlug = process.env.TENANT_ID;
  const defaultAmount = Number(process.env.DEFAULT_AMOUNT) || 50;
  const recordedAt = lastMonthDate();

  let tenantIds: string[];

  if (tenantIdOrSlug) {
    const t = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantIdOrSlug }, { slug: tenantIdOrSlug }],
      },
      select: { id: true },
    });
    if (!t) {
      console.error("Tenant not found:", tenantIdOrSlug);
      process.exit(1);
    }
    tenantIds = [t.id];
  } else {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    tenantIds = tenants.map((x) => x.id);
  }

  if (tenantIds.length === 0) {
    console.log("No tenants found.");
    return;
  }

  // 1. Delete all payments for these tenants (receipts cascade)
  const deleted = await prisma.payment.deleteMany({
    where: { tenantId: { in: tenantIds } },
  });
  console.log("Deleted", deleted.count, "payments (and their receipts).");

  // 2. All existing meters (each will get one payment for last month, with no receipts)
  const meters = await prisma.meter.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true, tenantId: true },
    orderBy: [{ tenantId: "asc" }, { meterNumber: "asc" }],
  });
  console.log("Existing meters:", meters.length);

  if (meters.length === 0) {
    console.log("No meters to create payments for.");
    return;
  }

  // 3. Per-tenant sequential payment number
  const nextNumByTenant = new Map<string, number>();

  let created = 0;
  for (const meter of meters) {
    const next = nextNumByTenant.get(meter.tenantId) ?? 1;
    const paymentNumber = String(next).padStart(6, "0");
    nextNumByTenant.set(meter.tenantId, next + 1);

    await prisma.payment.create({
      data: {
        tenantId: meter.tenantId,
        meterId: meter.id,
        paymentNumber,
        amount: defaultAmount,
        method: "CASH",
        recordedAt,
      },
    });
    created++;
  }

  console.log("Created", created, "payments for last month (recordedAt:", recordedAt.toISOString().slice(0, 10), "), amount:", defaultAmount);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
