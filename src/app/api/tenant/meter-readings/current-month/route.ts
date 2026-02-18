import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

/** GET: Check if there is already a reading for the current month for this meter. Collectors and users with permission. */
export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const canRecord = user.roleType === 'COLLECTOR' || userHasPermission(user, PERMISSIONS.METER_READINGS_RECORD);
  if (!canRecord) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const meterId = searchParams.get('meterId')?.trim();
  if (!meterId) {
    return NextResponse.json({ error: 'meterId required' }, { status: 400 });
  }
  const tenantId = user.tenantId!;
  const meter = await prisma.meter.findFirst({
    where: { id: meterId, tenantId },
    select: { id: true },
  });
  if (!meter) {
    return NextResponse.json({ error: 'Meter not found' }, { status: 404 });
  }
  // Current period = current calendar month (date-only). Use UTC for consistent comparison.
  const now = new Date();
  const startOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const startOfNextMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  const reading = await prisma.meterReading.findFirst({
    where: {
      meterId,
      recordedAt: { gte: startOfMonthUTC, lt: startOfNextMonthUTC },
    },
    orderBy: { recordedAt: 'desc' },
    select: { id: true, value: true, unit: true, recordedAt: true },
  });
  if (!reading) {
    return NextResponse.json({ existing: false });
  }
  return NextResponse.json({
    existing: true,
    reading: {
      id: reading.id,
      value: Number(reading.value),
      unit: reading.unit ?? 'm³',
      recordedAt: reading.recordedAt,
    },
  });
}
