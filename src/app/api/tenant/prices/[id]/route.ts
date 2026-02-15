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
  const { id } = await params;
  const price = await prisma.price.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { _count: { select: { meters: true } } },
  });
  if (!price) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(price);
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
  const tenantId = user.tenantId!;
  const { id } = await params;
  const existing = await prisma.price.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { name, pricePerCubic, isDefault } = body as { name?: string; pricePerCubic?: number; isDefault?: boolean };
  const data: { name?: string; pricePerCubic?: number; isDefault?: boolean } = {};
  if (name !== undefined) data.name = name.trim();
  if (pricePerCubic !== undefined) {
    const v = Number(pricePerCubic);
    if (Number.isNaN(v) || v < 0) {
      return NextResponse.json({ error: 'pricePerCubic must be a non-negative number' }, { status: 400 });
    }
    data.pricePerCubic = v;
  }
  if (isDefault === true) {
    await prisma.price.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
    data.isDefault = true;
  } else if (isDefault === false) {
    data.isDefault = false;
  }
  const price = await prisma.price.update({
    where: { id },
    data,
  });
  return NextResponse.json(price);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_EDIT)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.price.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { _count: { select: { meters: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing._count.meters > 0) {
    return NextResponse.json(
      { error: `${existing._count.meters} meter(s) use this price. Change or remove them first.` },
      { status: 400 }
    );
  }
  await prisma.price.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
