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
  { code: 'meters:view', name: 'View meters', module: 'meters' },
  { code: 'meters:create', name: 'Create meters', module: 'meters' },
  { code: 'meters:edit', name: 'Edit meters', module: 'meters' },
  { code: 'meters:delete', name: 'Delete meters', module: 'meters' },
  { code: 'meter_readings:view', name: 'View meter readings', module: 'meter_readings' },
  { code: 'meter_readings:record', name: 'Record meter readings', module: 'meter_readings' },
  { code: 'operations:zones_view', name: 'View zones', module: 'operations' },
  { code: 'operations:zones_manage', name: 'Manage zones', module: 'operations' },
  { code: 'operations:reading_cycles_view', name: 'View reading cycles', module: 'operations' },
  { code: 'operations:reading_cycles_manage', name: 'Manage reading cycles', module: 'operations' },
  { code: 'operations:bulk_import', name: 'Bulk import readings', module: 'operations' },
  { code: 'operations:audit_view', name: 'View reading audit', module: 'operations' },
  { code: 'invoices:view', name: 'View invoices', module: 'invoices' },
  { code: 'invoices:create', name: 'Create invoices', module: 'invoices' },
  { code: 'invoices:edit', name: 'Edit invoices', module: 'invoices' },
  { code: 'invoices:delete', name: 'Delete invoices', module: 'invoices' },
  { code: 'payments:view', name: 'View payments', module: 'payments' },
  { code: 'payments:record', name: 'Record payments', module: 'payments' },
  { code: 'billing:discounts_manage', name: 'Manage discounts', module: 'billing' },
  { code: 'billing:penalties_manage', name: 'Manage penalties', module: 'billing' },
  { code: 'billing:revenue_view', name: 'View revenue summary', module: 'billing' },
  { code: 'financial:view', name: 'View financial', module: 'financial' },
  { code: 'financial:expenses_manage', name: 'Manage expenses', module: 'financial' },
  { code: 'financial:payables_manage', name: 'Manage payables', module: 'financial' },
  { code: 'financial:receivables_manage', name: 'Manage receivables', module: 'financial' },
  { code: 'financial:vendors_manage', name: 'Manage vendors', module: 'financial' },
  { code: 'financial:budget_manage', name: 'Manage budget', module: 'financial' },
  { code: 'financial:reports_view', name: 'View financial reports', module: 'financial' },
  { code: 'workforce:view', name: 'View workforce', module: 'workforce' },
  { code: 'workforce:collectors_manage', name: 'Manage collectors', module: 'workforce' },
  { code: 'workforce:commissions_manage', name: 'Manage commissions', module: 'workforce' },
  { code: 'workforce:performance_view', name: 'View performance', module: 'workforce' },
  { code: 'customers:view', name: 'View customers', module: 'customers' },
  { code: 'customers:complaints_view', name: 'View complaints', module: 'customers' },
  { code: 'customers:complaints_manage', name: 'Manage complaints', module: 'customers' },
  { code: 'customers:service_requests_view', name: 'View service requests', module: 'customers' },
  { code: 'customers:service_requests_manage', name: 'Manage service requests', module: 'customers' },
  { code: 'analytics:view', name: 'View analytics', module: 'analytics' },
  { code: 'analytics:export', name: 'Export analytics', module: 'analytics' },
  { code: 'compliance:view', name: 'View compliance', module: 'compliance' },
  { code: 'compliance:export', name: 'Export compliance logs', module: 'compliance' },
  { code: 'reports:view', name: 'View reports', module: 'reports' },
  { code: 'reports:export', name: 'Export reports', module: 'reports' },
  { code: 'setup:view', name: 'View setup', module: 'setup' },
  { code: 'setup:tariffs_manage', name: 'Manage tariffs', module: 'setup' },
  { code: 'setup:billing_rules_manage', name: 'Manage billing rules', module: 'setup' },
  { code: 'setup:branding_manage', name: 'Manage branding', module: 'setup' },
  { code: 'users:view', name: 'View users', module: 'users' },
  { code: 'users:manage', name: 'Manage users', module: 'users' },
  { code: 'roles:manage', name: 'Manage roles', module: 'roles' },
  { code: 'settings:view', name: 'View settings', module: 'settings' },
  { code: 'settings:manage', name: 'Manage settings', module: 'settings' },
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
