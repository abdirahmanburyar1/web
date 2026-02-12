import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METER_READINGS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const where = { customer: { tenantId: user.tenantId! } };
  if (customerId) (where as Record<string, unknown>).customerId = customerId;
  const [readings, total] = await Promise.all([
    prisma.meterReading.findMany({
      where,
      skip,
      take: limit,
      orderBy: { recordedAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true, meterNumber: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.meterReading.count({ where }),
  ]);
  return NextResponse.json({ readings, total, page, limit });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METER_READINGS_RECORD)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { customerId, value, unit } = body as { customerId: string; value: number; unit?: string };
  if (!customerId || value == null) {
    return NextResponse.json({ error: 'customerId and value required' }, { status: 400 });
  }
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId! },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const reading = await prisma.meterReading.create({
    data: {
      customerId,
      value,
      unit: unit ?? 'm³',
      recordedById: user.id,
    },
    include: {
      customer: { select: { id: true, fullName: true, meterNumber: true } },
    },
  });
  return NextResponse.json(reading);
}
