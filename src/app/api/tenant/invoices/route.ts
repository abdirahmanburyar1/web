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
  const customerId = searchParams.get('customerId')?.trim();
  const status = searchParams.get('status')?.trim();
  const where = {
    tenantId: user.tenantId!,
    ...(customerId ? { customerId } : {}),
    ...(status ? { status } : {}),
  };
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issuedDate: 'desc' },
      include: { customer: { select: { id: true, fullName: true } } },
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
  const body = await req.json();
  const { customerId, amount, dueDate, items } = body as {
    customerId: string;
    amount: number;
    dueDate: string;
    items?: unknown;
  };
  if (!customerId || amount == null || amount < 0 || !dueDate) {
    return NextResponse.json({ error: 'customerId, amount, dueDate required' }, { status: 400 });
  }
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId! },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId!,
      customerId,
      amount,
      balance: amount,
      dueDate: new Date(dueDate),
      ...(items != null && { items: items as object }),
      status: amount === 0 ? 'PAID' : 'PENDING',
    },
    include: { customer: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json(invoice);
}
