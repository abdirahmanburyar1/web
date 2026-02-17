import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW) && !userHasPermission(user, PERMISSIONS.METERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')?.trim();
  const to = searchParams.get('to')?.trim();
  const dateWhere: { gte?: Date; lte?: Date } = {};
  if (from) dateWhere.gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateWhere.lte = toDate;
  }
  const paymentWhere = { tenantId, ...(Object.keys(dateWhere).length ? { recordedAt: dateWhere } : {}) };

  const [
    paymentsCount,
    paymentsSum,
    readingsCount,
    overdueInvoices,
    metersCount,
    paymentsRecent,
  ] = await Promise.all([
    prisma.payment.count({ where: paymentWhere }),
    prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
    prisma.meterReading.count({
      where: {
        meter: { tenantId },
        ...(Object.keys(dateWhere).length ? { recordedAt: dateWhere } : {}),
      },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.meter.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.payment.findMany({
      where: paymentWhere,
      take: 50,
      orderBy: { recordedAt: 'desc' },
      include: {
        meter: { select: { meterNumber: true, customerName: true } },
        collector: { select: { fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    summary: {
      paymentsCount,
      paymentsSum: paymentsSum._sum.amount ?? 0,
      readingsCount,
      overdueInvoices,
      metersCount,
    },
    recentPayments: paymentsRecent,
  });
}
