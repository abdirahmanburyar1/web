import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

const REVENUE_PER_TRANSACTION = 0.1;

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [tenantCount, activeTenantCount, totalPayments, paymentCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.count(),
  ]);
  const revenue = (paymentCount ?? 0) * REVENUE_PER_TRANSACTION;
  return NextResponse.json({
    tenants: { total: tenantCount, active: activeTenantCount },
    transactions: paymentCount,
    revenue,
    totalPaymentsVolume: totalPayments._sum.amount ?? 0,
  });
}
