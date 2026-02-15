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
  const canRecord = userHasPermission(user, PERMISSIONS.METER_READINGS_RECORD) || user.roleType === 'COLLECTOR';
  if (!canRecord) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { meterId, value, unit } = body as { meterId: string; value: number; unit?: string };
  if (!meterId || value == null) {
    return NextResponse.json({ error: 'meterId and value required' }, { status: 400 });
  }
  const tenantId = user.tenantId!;
  const meter = await prisma.meter.findFirst({
    where: { id: meterId, tenantId },
    include: { price: true },
  });
  if (!meter) return NextResponse.json({ error: 'Meter not found' }, { status: 404 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const existingThisMonth = await prisma.meterReading.findFirst({
    where: {
      meterId,
      recordedAt: { gte: startOfMonth },
    },
    select: { id: true },
  });
  if (existingThisMonth) {
    return NextResponse.json(
      { error: 'This meter has already been read this month. Please move on to the next meter.' },
      { status: 400 }
    );
  }

  let pricePerCubic: number;
  if (meter.price) {
    pricePerCubic = Number(meter.price.pricePerCubic);
  } else {
    const defaultPrice = await prisma.price.findFirst({
      where: { tenantId, isDefault: true },
      select: { pricePerCubic: true },
    });
    if (defaultPrice) {
      pricePerCubic = Number(defaultPrice.pricePerCubic);
    } else {
      const fallback = await prisma.price.findFirst({
        where: { tenantId },
        select: { pricePerCubic: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!fallback) {
        return NextResponse.json(
          { error: 'No price defined for this tenant. Create a price in Settings → Prices.' },
          { status: 400 }
        );
      }
      pricePerCubic = Number(fallback.pricePerCubic);
    }
  }

  const valueNum = Number(value);
  const previousReading = await prisma.meterReading.findFirst({
    where: { meterId },
    orderBy: { recordedAt: 'desc' },
    select: { value: true },
  });
  const previousValue = previousReading ? Number(previousReading.value) : 0;
  const usageThisPeriod = Math.max(0, valueNum - previousValue);
  const currentPeriodAmount = Math.round(usageThisPeriod * pricePerCubic * 100) / 100;

  const previousPayment = await prisma.payment.findFirst({
    where: { meterId },
    orderBy: { recordedAt: 'desc' },
    select: { amount: true },
  });
  const previousBalance = previousPayment ? Number(previousPayment.amount) : 0;
  const amountDue = Math.round((previousBalance + currentPeriodAmount) * 100) / 100;

  const existingPayments = await prisma.payment.findMany({
    where: { tenantId, paymentNumber: { not: null } },
    select: { paymentNumber: true },
  });
  const numbers = existingPayments
    .map((p) => (p.paymentNumber && /^\d+$/.test(p.paymentNumber) ? parseInt(p.paymentNumber, 10) : 0))
    .filter((n) => n > 0);
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  const paymentNumber = String(nextNum).padStart(6, '0');

  const reading = await prisma.meterReading.create({
    data: {
      meterId,
      value,
      unit: unit ?? 'm³',
      recordedById: user.id,
    },
    include: {
      meter: { select: { id: true, meterNumber: true, customerName: true, plateNumber: true, address: true } },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      meterId,
      paymentNumber,
      amount: amountDue,
      method: 'CASH',
      collectorId: user.id,
      reference: `Reading ${reading.id}`,
    },
    include: {
      meter: { select: { id: true, meterNumber: true, customerName: true, plateNumber: true, address: true } },
    },
  });

  return NextResponse.json({
    reading,
    usageThisPeriod,
    pricePerCubic,
    currentPeriodAmount,
    previousBalance,
    amountDue,
    oldBalance: previousValue,
    currentBalance: valueNum,
    payment: {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      amount: Number(payment.amount),
      recordedAt: payment.recordedAt,
      meter: payment.meter,
    },
    meter: reading.meter,
  });
}
