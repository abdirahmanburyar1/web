import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

const METER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'OVERDUE', 'INACTIVE'] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const meter = await prisma.meter.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      zone: true,
      collector: { select: { id: true, fullName: true, email: true } },
      invoices: { orderBy: { issuedDate: 'desc' }, take: 10 },
      payments: { orderBy: { recordedAt: 'desc' }, take: 10 },
      meterReadings: { orderBy: { recordedAt: 'desc' }, take: 10 },
    },
  });
  if (!meter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(meter);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_EDIT)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
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
  } = body;
  const data: Record<string, unknown> = {};
  if (meterNumber !== undefined) data.meterNumber = String(meterNumber).trim();
  if (customerName !== undefined) data.customerName = String(customerName).trim();
  if (customerPhone !== undefined) data.customerPhone = customerPhone?.trim() || null;
  if (residentPhone !== undefined) data.residentPhone = residentPhone?.trim() || null;
  if (section !== undefined) data.section = section?.trim() || null;
  if (subSection !== undefined) data.subSection = subSection?.trim() || null;
  if (zoneId !== undefined) data.zoneId = zoneId || null;
  if (plateNumber !== undefined) data.plateNumber = plateNumber?.trim() || null;
  if (status !== undefined && METER_STATUSES.includes(status)) data.status = status;
  if (address !== undefined) data.address = address?.trim() || null;
  if (meterType !== undefined) data.meterType = meterType?.trim() || null;
  if (meterModel !== undefined) data.meterModel = meterModel?.trim() || null;
  if (installationDate !== undefined) data.installationDate = installationDate ? new Date(installationDate) : null;
  if (serialNumber !== undefined) data.serialNumber = serialNumber?.trim() || null;
  if (collectorId !== undefined) data.collectorId = collectorId || null;
  const updated = await prisma.meter.updateMany({
    where: { id, tenantId: user.tenantId! },
    data,
  });
  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const meter = await prisma.meter.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { zone: true, collector: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json(meter);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_DELETE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const meter = await prisma.meter.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { _count: { select: { invoices: true, payments: true, meterReadings: true } } },
  });
  if (!meter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (meter._count.invoices > 0 || meter._count.payments > 0 || meter._count.meterReadings > 0) {
    return NextResponse.json(
      { error: 'Cannot delete meter with existing invoices, payments, or readings' },
      { status: 400 }
    );
  }
  await prisma.meter.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
