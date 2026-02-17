import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
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
  const where = { tenantId, ...(Object.keys(dateWhere).length ? { recordedAt: dateWhere } : {}) };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    take: 5000,
    include: {
      meter: { select: { meterNumber: true, customerName: true } },
      collector: { select: { fullName: true } },
    },
  });

  const headers = ['date', 'paymentNumber', 'meterNumber', 'customerName', 'amount', 'method', 'collector'];
  const rows = payments.map((p) => [
    new Date(p.recordedAt).toISOString().slice(0, 19),
    p.paymentNumber ?? '',
    p.meter?.meterNumber ?? '',
    p.meter?.customerName ?? '',
    Number(p.amount).toFixed(2),
    p.method ?? '',
    p.collector?.fullName ?? '',
  ]);
  const data = [headers, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `payments-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
