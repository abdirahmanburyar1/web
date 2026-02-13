import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const roles = await prisma.role.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
    },
  });
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const body = await req.json().catch(() => ({}));
  const { name, description, permissionIds } = body as {
    name: string;
    description?: string;
    permissionIds?: string[];
  };
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const role = await prisma.role.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      ...(Array.isArray(permissionIds) && permissionIds.length > 0
        ? {
            permissions: {
              create: permissionIds.map((permissionId) => ({ permissionId })),
            },
          }
        : {}),
    },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
    },
  });
  return NextResponse.json(role);
}
