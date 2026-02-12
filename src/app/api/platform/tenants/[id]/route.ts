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
      _count: { select: { users: true, customers: true, invoices: true, payments: true } },
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
  const { status, subscriptionPlan, maxStaff, maxCustomers, maxTransactions, name, billingCycle } =
    body as {
      status?: string;
      subscriptionPlan?: string;
      maxStaff?: number;
      maxCustomers?: number;
      maxTransactions?: number;
      name?: string;
      billingCycle?: string;
    };
  const data: Record<string, unknown> = {};
  if (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'PENDING') data.status = status;
  if (subscriptionPlan) data.subscriptionPlan = subscriptionPlan;
  if (maxStaff !== undefined) data.maxStaff = maxStaff;
  if (maxCustomers !== undefined) data.maxCustomers = maxCustomers;
  if (maxTransactions !== undefined) data.maxTransactions = maxTransactions;
  if (name !== undefined) data.name = name;
  if (billingCycle !== undefined) data.billingCycle = billingCycle;
  const tenant = await prisma.tenant.update({
    where: { id },
    data,
  });
  return NextResponse.json(tenant);
}
