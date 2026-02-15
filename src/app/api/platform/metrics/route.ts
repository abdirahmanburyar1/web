import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [tenantCount, activeTenantCount, totalPayments, paymentCount, tenantsWithFee] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.count(),
    prisma.tenant.findMany({
      select: { feePerPayment: true, _count: { select: { payments: true } } },
    }),
  ]);
  const revenue = tenantsWithFee.reduce(
    (sum, t) => sum + t._count.payments * Number(t.feePerPayment ?? 0.2),
    0
  );
  return NextResponse.json({
    tenants: { total: tenantCount, active: activeTenantCount },
    transactions: paymentCount,
    revenue,
    totalPaymentsVolume: totalPayments._sum.amount ?? 0,
  });
}
