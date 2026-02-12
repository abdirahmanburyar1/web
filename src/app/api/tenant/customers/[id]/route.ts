import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      zone: true,
      invoices: { orderBy: { issuedDate: 'desc' }, take: 10 },
      payments: { orderBy: { recordedAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.CUSTOMERS_EDIT)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { fullName, email, phoneNumber, address, meterNumber, zoneId, isActive } = body;
  const customer = await prisma.customer.updateMany({
    where: { id, tenantId: user.tenantId! },
    data: {
      ...(fullName !== undefined && { fullName: fullName.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(meterNumber !== undefined && { meterNumber: meterNumber?.trim() || null }),
      ...(zoneId !== undefined && { zoneId: zoneId || null }),
      ...(isActive !== undefined && { isActive: !!isActive }),
    },
  });
  if (customer.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { zone: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.CUSTOMERS_DELETE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.customer.updateMany({
    where: { id, tenantId: user.tenantId! },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
