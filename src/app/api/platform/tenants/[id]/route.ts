import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, meters: true, invoices: true, payments: true } },
    },
  });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const {
    status,
    name,
    feePerPayment,
    subscriptionPlan,
    billingCycle,
    currency,
    maxStaff,
    maxCustomers,
    maxTransactions,
  } = body as {
    status?: string;
    name?: string;
    feePerPayment?: number;
    subscriptionPlan?: string;
    billingCycle?: string | null;
    currency?: string;
    maxStaff?: number | string | null;
    maxCustomers?: number | string | null;
    maxTransactions?: number | string | null;
  };
  const data: Record<string, unknown> = {};
  if (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'PENDING') data.status = status;
  if (name !== undefined) data.name = name;
  if (feePerPayment !== undefined && !Number.isNaN(Number(feePerPayment))) data.feePerPayment = Number(feePerPayment);
  if (subscriptionPlan === 'BASIC' || subscriptionPlan === 'STANDARD' || subscriptionPlan === 'PREMIUM' || subscriptionPlan === 'ENTERPRISE') {
    data.subscriptionPlan = subscriptionPlan;
  }
  if (billingCycle !== undefined) data.billingCycle = billingCycle || null;
  if (currency !== undefined) data.currency = currency || 'USD';
  if (maxStaff !== undefined) data.maxStaff = maxStaff == null || maxStaff === '' ? null : Number(maxStaff);
  if (maxCustomers !== undefined) data.maxCustomers = maxCustomers == null || maxCustomers === '' ? null : Number(maxCustomers);
  if (maxTransactions !== undefined) data.maxTransactions = maxTransactions == null || maxTransactions === '' ? null : Number(maxTransactions);
  const tenant = await prisma.tenant.update({
    where: { id },
    data,
  });
  return NextResponse.json(tenant);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  try {
    await prisma.tenant.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete tenant: it has users, meters, or other data. Remove them first or contact support.' },
        { status: 400 }
      );
    }
    throw e;
  }
}
