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
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const role = await prisma.role.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: { select: { id: true, code: true, name: true, module: true } } } },
    },
  });
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(role);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const role = await prisma.role.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { name, description, permissionIds } = body as {
    name?: string;
    description?: string;
    permissionIds?: string[];
  };
  const data: { name?: string; description?: string | null } = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (Array.isArray(permissionIds)) {
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.role.update({
    where: { id },
    data,
    include: {
      permissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const role = await prisma.role.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (role._count.users > 0) {
    return NextResponse.json(
      { error: 'Cannot delete role: assign users to another role first' },
      { status: 400 }
    );
  }
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
