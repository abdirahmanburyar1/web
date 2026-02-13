import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Create platform admin if none exists (for first run)
async function ensurePlatformAdmin() {
  const existing = await prisma.user.findFirst({
    where: { roleType: 'PLATFORM_ADMIN' },
  });
  if (existing) return;
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@aquatrack.so',
      passwordHash: hash,
      fullName: 'Platform Admin',
      roleType: 'PLATFORM_ADMIN',
      isActive: true,
    },
  });
  console.log('Created platform admin: admin@aquatrack.so / admin123');
}

const PERMISSION_LIST = [
  { code: 'customers:view', name: 'View customers', module: 'customers' },
  { code: 'customers:create', name: 'Create customers', module: 'customers' },
  { code: 'customers:edit', name: 'Edit customers', module: 'customers' },
  { code: 'customers:delete', name: 'Delete customers', module: 'customers' },
  { code: 'invoices:view', name: 'View invoices', module: 'invoices' },
  { code: 'invoices:create', name: 'Create invoices', module: 'invoices' },
  { code: 'invoices:edit', name: 'Edit invoices', module: 'invoices' },
  { code: 'invoices:delete', name: 'Delete invoices', module: 'invoices' },
  { code: 'payments:view', name: 'View payments', module: 'payments' },
  { code: 'payments:record', name: 'Record payments', module: 'payments' },
  { code: 'reports:view', name: 'View reports', module: 'reports' },
  { code: 'reports:export', name: 'Export reports', module: 'reports' },
  { code: 'users:view', name: 'View users', module: 'users' },
  { code: 'users:manage', name: 'Manage users', module: 'users' },
  { code: 'roles:manage', name: 'Manage roles', module: 'roles' },
  { code: 'settings:view', name: 'View settings', module: 'settings' },
  { code: 'settings:manage', name: 'Manage settings', module: 'settings' },
  { code: 'meter_readings:view', name: 'View meter readings', module: 'meter_readings' },
  { code: 'meter_readings:record', name: 'Record meter readings', module: 'meter_readings' },
];

async function ensurePlanLimits() {
  const plans: Array<{ plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE'; maxStaff: number | null; maxCustomers: number | null; maxTransactions: number | null }> = [
    { plan: 'BASIC', maxStaff: 5, maxCustomers: 500, maxTransactions: 1000 },
    { plan: 'STANDARD', maxStaff: 20, maxCustomers: 2000, maxTransactions: 10000 },
    { plan: 'PREMIUM', maxStaff: 100, maxCustomers: 10000, maxTransactions: 100000 },
    { plan: 'ENTERPRISE', maxStaff: null, maxCustomers: null, maxTransactions: null },
  ];
  for (const pl of plans) {
    await prisma.planLimit.upsert({
      where: { plan: pl.plan },
      create: pl,
      update: { maxStaff: pl.maxStaff, maxCustomers: pl.maxCustomers, maxTransactions: pl.maxTransactions },
    });
  }
  console.log('Seeded plan limits.');
}

async function main() {
  await ensurePlatformAdmin();
  await ensurePlanLimits();
  for (const p of PERMISSION_LIST) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: { name: p.name, module: p.module },
    });
  }
  console.log('Seeded permissions.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
