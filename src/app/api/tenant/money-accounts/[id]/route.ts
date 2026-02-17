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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const { id } = await params;
  const account = await prisma.tenantMoneyAccount.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(account);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!canAccessMoneyAccounts(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const { id } = await params;
  const existing = await prisma.tenantMoneyAccount.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { name, type, accountNumber, sortOrder } = body as {
    name?: string;
    type?: string;
    accountNumber?: string | null;
    sortOrder?: number;
  };
  const data: { name?: string; type?: string; accountNumber?: string | null; sortOrder?: number } = {};
  if (name !== undefined) data.name = name.trim();
  if (type && ACCOUNT_TYPES.includes(type as typeof ACCOUNT_TYPES[number])) data.type = type;
  if (accountNumber !== undefined) data.accountNumber = accountNumber?.trim() || null;
  if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
  const account = await prisma.tenantMoneyAccount.update({
    where: { id },
    data,
  });
  return NextResponse.json(account);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!canAccessMoneyAccounts(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const { id } = await params;
  const existing = await prisma.tenantMoneyAccount.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.tenantMoneyAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
