import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.INVOICES_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const meterId = searchParams.get('meterId')?.trim();
  const status = searchParams.get('status')?.trim();
  const where = {
    tenantId: user.tenantId!,
    ...(meterId ? { meterId } : {}),
    ...(status ? { status } : {}),
  };
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issuedDate: 'desc' },
      include: { meter: { select: { id: true, meterNumber: true, customerName: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return NextResponse.json({ invoices, total, page, limit });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.INVOICES_CREATE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { meterId, amount, dueDate, items } = body as {
    meterId: string;
    amount: number;
    dueDate: string;
    items?: unknown;
  };
  if (!meterId || amount == null || amount < 0 || !dueDate) {
    return NextResponse.json({ error: 'meterId, amount, dueDate required' }, { status: 400 });
  }
  const meter = await prisma.meter.findFirst({
    where: { id: meterId, tenantId: user.tenantId! },
  });
  if (!meter) return NextResponse.json({ error: 'Meter not found' }, { status: 404 });
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId!,
      meterId,
      amount,
      balance: amount,
      dueDate: new Date(dueDate),
      ...(items != null && { items: items as object }),
      status: amount === 0 ? 'PAID' : 'PENDING',
    },
    include: { meter: { select: { id: true, meterNumber: true, customerName: true } } },
  });
  return NextResponse.json(invoice);
}
