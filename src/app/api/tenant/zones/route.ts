import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.METERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const zones = await prisma.zone.findMany({
    where: { tenantId: user.tenantId! },
    orderBy: { name: 'asc' },
    include: { _count: { select: { meters: true } } },
  });
  return NextResponse.json(zones);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { name, description } = body as { name: string; description?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const zone = await prisma.zone.create({
    data: {
      tenantId: user.tenantId!,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });
  return NextResponse.json(zone);
}
