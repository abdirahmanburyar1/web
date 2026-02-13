import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

const METER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'OVERDUE', 'INACTIVE'] as const;

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const search = searchParams.get('search')?.trim();
  const zoneId = searchParams.get('zoneId')?.trim();
  const status = searchParams.get('status')?.trim();
  const collectorId = searchParams.get('collectorId')?.trim();
  const where: Record<string, unknown> = {
    tenantId: user.tenantId!,
  };
  if (search) {
    where.OR = [
      { meterNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
      { residentPhone: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { plateNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (zoneId) where.zoneId = zoneId;
  if (status && METER_STATUSES.includes(status as typeof METER_STATUSES[number])) where.status = status;
  if (collectorId) where.collectorId = collectorId;
  const [meters, total] = await Promise.all([
    prisma.meter.findMany({
      where,
      skip,
      take: limit,
      orderBy: { meterNumber: 'asc' },
      include: {
        zone: { select: { id: true, name: true } },
        collector: { select: { id: true, fullName: true } },
      },
    }),
    prisma.meter.count({ where }),
  ]);
  return NextResponse.json({ meters, total, page, limit });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const tenantId = user.tenantId!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (tenant?.maxCustomers != null) {
    const count = await prisma.meter.count({ where: { tenantId } });
    if (count >= tenant.maxCustomers) {
      return NextResponse.json(
        { error: 'Meter limit reached for your plan' },
        { status: 403 }
      );
    }
  }
  const body = await req.json().catch(() => ({}));
  const {
    meterNumber,
    customerName,
    customerPhone,
    residentPhone,
    section,
    subSection,
    zoneId,
    plateNumber,
    status,
    address,
    meterType,
    meterModel,
    installationDate,
    serialNumber,
    collectorId,
  } = body as {
    meterNumber: string;
    customerName: string;
    customerPhone?: string;
    residentPhone?: string;
    section?: string;
    subSection?: string;
    zoneId?: string;
    plateNumber?: string;
    status?: string;
    address?: string;
    meterType?: string;
    meterModel?: string;
    installationDate?: string;
    serialNumber?: string;
    collectorId?: string;
  };
  if (!meterNumber?.trim() || !customerName?.trim()) {
    return NextResponse.json({ error: 'meterNumber and customerName required' }, { status: 400 });
  }
  const num = meterNumber.trim();
  const existing = await prisma.meter.findFirst({
    where: { tenantId, meterNumber: num },
  });
  if (existing) {
    return NextResponse.json({ error: 'Meter number already exists for this tenant' }, { status: 400 });
  }
  const statusVal = status && METER_STATUSES.includes(status as typeof METER_STATUSES[number]) ? status : 'PENDING';
  const meter = await prisma.meter.create({
    data: {
      tenantId,
      meterNumber: num,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || null,
      residentPhone: residentPhone?.trim() || null,
      section: section?.trim() || null,
      subSection: subSection?.trim() || null,
      zoneId: zoneId || null,
      plateNumber: plateNumber?.trim() || null,
      status: statusVal as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'OVERDUE' | 'INACTIVE',
      address: address?.trim() || null,
      meterType: meterType?.trim() || null,
      meterModel: meterModel?.trim() || null,
      installationDate: installationDate ? new Date(installationDate) : null,
      serialNumber: serialNumber?.trim() || null,
      collectorId: collectorId || null,
    },
    include: {
      zone: { select: { id: true, name: true } },
      collector: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json(meter);
}
