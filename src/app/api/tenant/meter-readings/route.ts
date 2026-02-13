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
  const meterId = searchParams.get('meterId');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const where: { meter: { tenantId: string }; meterId?: string } = { meter: { tenantId: user.tenantId! } };
  if (meterId) where.meterId = meterId;
  const [readings, total] = await Promise.all([
    prisma.meterReading.findMany({
      where,
      skip,
      take: limit,
      orderBy: { recordedAt: 'desc' },
      include: {
        meter: { select: { id: true, meterNumber: true, customerName: true } },
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
  const body = await req.json().catch(() => ({}));
  const { meterId, value, unit } = body as { meterId: string; value: number; unit?: string };
  if (!meterId || value == null) {
    return NextResponse.json({ error: 'meterId and value required' }, { status: 400 });
  }
  const meter = await prisma.meter.findFirst({
    where: { id: meterId, tenantId: user.tenantId! },
  });
  if (!meter) return NextResponse.json({ error: 'Meter not found' }, { status: 404 });
  const reading = await prisma.meterReading.create({
    data: {
      meterId,
      value,
      unit: unit ?? 'm³',
      recordedById: user.id,
    },
    include: {
      meter: { select: { id: true, meterNumber: true, customerName: true } },
    },
  });
  return NextResponse.json(reading);
}
