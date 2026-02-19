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
  const meterId = searchParams.get('meterId')?.trim();
  const zoneId = searchParams.get('zoneId')?.trim();
  const searchMeter = searchParams.get('search')?.trim(); // meter number or customer name
  const recordedById = searchParams.get('recordedById')?.trim();
  const from = searchParams.get('from')?.trim();
  const to = searchParams.get('to')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
  const skip = (page - 1) * limit;
  const tenantId = user.tenantId!;
  const meterWhere: { tenantId: string; id?: string; zoneId?: string; OR?: Array<{ meterNumber?: string; plateNumber?: string; customerName?: { contains: string; mode: 'insensitive' } }> } = { tenantId };
  if (meterId) meterWhere.id = meterId;
  if (zoneId) meterWhere.zoneId = zoneId;
  if (searchMeter && !meterId) {
    meterWhere.OR = [
      { meterNumber: searchMeter },
      { plateNumber: searchMeter },
      { customerName: { contains: searchMeter, mode: 'insensitive' } },
    ];
  }
  const where: {
    meter: typeof meterWhere;
    recordedById?: string;
    recordedAt?: { gte?: Date; lte?: Date };
  } = { meter: meterWhere };
  if (recordedById) where.recordedById = recordedById;
  if (from || to) {
    where.recordedAt = {};
    if (from) where.recordedAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.recordedAt.lte = toDate;
    }
  }
  const [readings, total] = await Promise.all([
    prisma.meterReading.findMany({
      where,
      skip,
      take: limit,
      orderBy: { recordedAt: 'desc' },
      select: {
        id: true,
        value: true,
        unit: true,
        pricePerCubic: true,
        recordedAt: true,
        meterId: true,
        recordedById: true,
        meter: { select: { id: true, meterNumber: true, customerName: true, price: { select: { id: true, name: true, pricePerCubic: true } } } },
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

  // Current period = current calendar month (date-only, no time). Use UTC so the check is consistent.
  const now = new Date();
  const startOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const startOfNextMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  const existingThisMonth = await prisma.meterReading.findFirst({
    where: {
      meterId,
      recordedAt: { gte: startOfMonthUTC, lt: startOfNextMonthUTC },
    },
    select: { id: true, value: true, unit: true, recordedAt: true },
  });

  // Unpaid balance from last month: last payment amount minus what was paid (receipts)
  const previousPayment = await prisma.payment.findFirst({
    where: { meterId },
    orderBy: { recordedAt: 'desc' },
    select: { id: true, amount: true, receipts: { select: { amount: true } } },
  });
  let previousBalance = 0;
  if (previousPayment) {
    const paid = previousPayment.receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    previousBalance = Math.max(0, Math.round((Number(previousPayment.amount) - paid) * 100) / 100);
  }
  // Block duplicate: one reading per meter per month. No second reading in the same month (no transfer-flow exception).
  if (existingThisMonth) {
    return NextResponse.json(
      {
        error: 'This meter has already been read this month. Please move on to the next meter.',
        alreadyGeneratedCurrentMonth: true,
        existingReading: {
          id: existingThisMonth.id,
          value: Number(existingThisMonth.value),
          unit: existingThisMonth.unit ?? 'm³',
          recordedAt: existingThisMonth.recordedAt,
        },
      },
      { status: 400 }
    );
  }

  const isTransferFlow = false; // No longer allow second reading in same month for "transfer"

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
  // When transferring: use last reading before this month so current-month usage = new value - end of last month
  const previousReading = await prisma.meterReading.findFirst({
    where: isTransferFlow
      ? { meterId, recordedAt: { lt: startOfMonthUTC } }
      : { meterId },
    orderBy: { recordedAt: 'desc' },
    select: { value: true },
  });
  const previousValue = previousReading ? Number(previousReading.value) : 0;
  const usageThisPeriod = Math.max(0, valueNum - previousValue);
  const currentPeriodAmount = Math.round(usageThisPeriod * pricePerCubic * 100) / 100;
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

  const nowForCycle = new Date();
  const cycleForDate = await prisma.readingCycle.findFirst({
    where: {
      tenantId,
      startDate: { lte: nowForCycle },
      endDate: { gte: nowForCycle },
    },
    select: { id: true, isClosed: true, name: true },
  });
  if (cycleForDate?.isClosed) {
    return NextResponse.json(
      { error: `This period (${cycleForDate.name}) is closed. No new readings can be added.` },
      { status: 400 }
    );
  }
  const readingCycleId = cycleForDate?.id ?? null;

  // Re-check inside transaction to prevent race: two requests submitting at once can't both create.
  let reading;
  try {
    reading = await prisma.$transaction(async (tx) => {
      const again = await tx.meterReading.findFirst({
        where: {
          meterId,
          recordedAt: { gte: startOfMonthUTC, lt: startOfNextMonthUTC },
        },
        select: { id: true },
      });
      if (again) {
        throw new Error('DUPLICATE_READING_THIS_MONTH');
      }
      const created = await tx.meterReading.create({
        data: {
          meterId,
          readingCycleId,
          value,
          unit: unit ?? 'm³',
          pricePerCubic,
          recordedById: user.id,
        },
        include: {
          meter: { select: { id: true, meterNumber: true, customerName: true, plateNumber: true, address: true } },
        },
      });
      await tx.meter.update({
        where: { id: meterId },
        data: {
          lastReadingValue: value,
          lastReadingDate: new Date(),
        },
      });
      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'DUPLICATE_READING_THIS_MONTH') {
      const existingAgain = await prisma.meterReading.findFirst({
        where: {
          meterId,
          recordedAt: { gte: startOfMonthUTC, lt: startOfNextMonthUTC },
        },
        select: { id: true, value: true, unit: true, recordedAt: true },
      });
      return NextResponse.json(
        {
          error: 'This meter has already been read this month. Please move on to the next meter.',
          alreadyGeneratedCurrentMonth: true,
          existingReading: existingAgain
            ? {
                id: existingAgain.id,
                value: Number(existingAgain.value),
                unit: existingAgain.unit ?? 'm³',
                recordedAt: existingAgain.recordedAt,
              }
            : undefined,
        },
        { status: 400 }
      );
    }
    throw err;
  }

  const readingDateTime = new Date(reading.recordedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  const reference = `${readingDateTime} | $${Number(pricePerCubic).toFixed(4)}/m³ | ${usageThisPeriod} m³`;
  const payment = await prisma.payment.create({
    data: {
      tenantId,
      meterId,
      paymentNumber,
      amount: amountDue,
      collectorId: user.id,
      reference,
    },
    include: {
      meter: { select: { id: true, meterNumber: true, customerName: true, plateNumber: true, address: true } },
    },
  });

  if (isTransferFlow && previousPayment) {
    await prisma.payment.update({
      where: { id: previousPayment.id },
      data: { status: 'TRANSFERRED' },
    });
  }

  return NextResponse.json({
    reading,
    usageThisPeriod,
    pricePerCubic,
    currentPeriodAmount,
    previousBalance,
    amountDue,
    oldBalance: previousValue,
    currentBalance: valueNum,
    transferred: isTransferFlow ? true : undefined,
    transferredPaymentId: isTransferFlow && previousPayment ? previousPayment.id : undefined,
    payment: {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      amount: Number(payment.amount),
      status: payment.status,
      recordedAt: payment.recordedAt,
      reference: payment.reference,
      meter: payment.meter,
    },
    meter: reading.meter,
  });
}
