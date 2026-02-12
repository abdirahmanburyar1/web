import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && !userHasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [customersCount, paymentsThisMonth, totalCollectedThisMonth, overdueInvoices] = await Promise.all([
    prisma.customer.count({ where: { tenantId, isActive: true } }),
    prisma.payment.count({
      where: { tenantId, recordedAt: { gte: startOfMonth } },
    }),
    prisma.payment.aggregate({
      where: { tenantId, recordedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lt: now },
      },
    }),
  ]);
  return NextResponse.json({
    customersCount,
    paymentsThisMonth,
    totalCollectedThisMonth: totalCollectedThisMonth._sum.amount ?? 0,
    overdueInvoices,
  });
}
