import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const tenantId = user.tenantId!;
  const prices = await prisma.price.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { meters: true } } },
  });
  return NextResponse.json(prices);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_EDIT) && !userHasPermission(user, PERMISSIONS.METERS_CREATE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const body = await req.json().catch(() => ({}));
  const { name, pricePerCubic, isDefault } = body as { name?: string; pricePerCubic?: number; isDefault?: boolean };
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const priceVal = pricePerCubic != null ? Number(pricePerCubic) : NaN;
  if (Number.isNaN(priceVal) || priceVal < 0) {
    return NextResponse.json({ error: 'pricePerCubic must be a non-negative number' }, { status: 400 });
  }
  if (isDefault === true) {
    await prisma.price.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }
  const price = await prisma.price.create({
    data: {
      tenantId,
      name: name.trim(),
      pricePerCubic: priceVal,
      isDefault: isDefault === true,
    },
  });
  return NextResponse.json(price);
}
