import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';
import type { PaymentMethod } from '@prisma/client';

const REVENUE_PER_TRANSACTION = 0.1;

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId: user.tenantId! },
      skip,
      take: limit,
      orderBy: { recordedAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true } },
        collector: { select: { id: true, fullName: true } },
        invoice: { select: { id: true } },
      },
    }),
    prisma.payment.count({ where: { tenantId: user.tenantId! } }),
  ]);
  return NextResponse.json({ payments, total, page, limit });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_RECORD)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (tenant?.maxTransactions != null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const count = await prisma.payment.count({
      where: { tenantId, recordedAt: { gte: startOfMonth } },
    });
    if (count >= tenant.maxTransactions) {
      return NextResponse.json(
        { error: 'Transaction limit reached for this period' },
        { status: 403 }
      );
    }
  }
  const body = await req.json();
  const { customerId, amount, method, invoiceId, reference } = body as {
    customerId: string;
    amount: number;
    method?: string;
    invoiceId?: string;
    reference?: string;
  };
  if (!customerId || amount == null || amount <= 0) {
    return NextResponse.json({ error: 'customerId and positive amount required' }, { status: 400 });
  }
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  const paymentMethod = (method ?? 'CASH') as PaymentMethod;
  const payment = await prisma.payment.create({
    data: {
      tenantId,
      customerId,
      amount,
      method: paymentMethod,
      invoiceId: invoiceId || null,
      reference: reference?.trim() || null,
      collectorId: user.roleType === 'COLLECTOR' ? user.id : null,
    },
    include: {
      customer: { select: { id: true, fullName: true } },
      collector: { select: { id: true, fullName: true } },
    },
  });
  if (invoiceId) {
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (inv) {
      const newBalance = Number(inv.balance) - Number(amount);
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          balance: newBalance,
          status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
        },
      });
    }
  }
  return NextResponse.json(payment);
}
