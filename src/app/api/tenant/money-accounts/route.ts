import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

const ACCOUNT_TYPES = ['BANK', 'MOBILE_MONEY', 'CASH', 'OTHER'] as const;

function canAccessMoneyAccounts(user: { roleType?: string; role?: { permissions: { permission: { code: string } }[] } | null; directPermissions?: Array<{ permission: { code: string } }> }) {
  return (
    userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW) ||
    userHasPermission(user, PERMISSIONS.METERS_VIEW) ||
    userHasPermission(user, PERMISSIONS.SETTINGS_VIEW) ||
    userHasPermission(user, PERMISSIONS.SETTINGS_MANAGE)
  );
}

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!canAccessMoneyAccounts(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const accounts = await prisma.tenantMoneyAccount.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!canAccessMoneyAccounts(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const body = await req.json().catch(() => ({}));
  const { name, type, accountNumber, sortOrder } = body as {
    name?: string;
    type?: string;
    accountNumber?: string | null;
    sortOrder?: number;
  };
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const typeVal = type && ACCOUNT_TYPES.includes(type as typeof ACCOUNT_TYPES[number]) ? type : 'OTHER';
  const count = await prisma.tenantMoneyAccount.count({ where: { tenantId } });
  const account = await prisma.tenantMoneyAccount.create({
    data: {
      tenantId,
      name: name.trim(),
      type: typeVal,
      accountNumber: accountNumber?.trim() || null,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : count,
    },
  });
  return NextResponse.json(account);
}
