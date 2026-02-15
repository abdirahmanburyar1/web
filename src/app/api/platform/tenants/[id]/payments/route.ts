import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  const payments = await prisma.platformPayment.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { receipts: true },
  });
  return NextResponse.json(payments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { amount, currency, status, description, paidAt } = body as {
    amount: number;
    currency?: string;
    status?: string;
    description?: string;
    paidAt?: string;
  };
  if (amount == null || Number.isNaN(Number(amount))) {
    return NextResponse.json({ error: 'amount required' }, { status: 400 });
  }
  const statusVal = status === 'PAID' || status === 'FAILED' ? status : 'PENDING';
  const payment = await prisma.platformPayment.create({
    data: {
      tenantId,
      amount: Number(amount),
      currency: currency?.trim() || tenant.currency,
      status: statusVal,
      description: description?.trim() || null,
      paidAt: paidAt ? new Date(paidAt) : null,
    },
    include: { receipts: true },
  });
  return NextResponse.json(payment);
}
