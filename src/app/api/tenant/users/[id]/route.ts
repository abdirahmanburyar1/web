import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.USERS_VIEW) && !userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, tenantId: user.tenantId! },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      roleType: true,
      roleId: true,
      isActive: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
      directPermissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
    },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(target);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const {
    fullName,
    phoneNumber,
    roleType,
    roleId,
    isActive,
    password,
    directPermissionIds,
  } = body as {
    fullName?: string;
    phoneNumber?: string | null;
    roleType?: string;
    roleId?: string | null;
    isActive?: boolean;
    password?: string;
    directPermissionIds?: string[];
  };
  const data: {
    fullName?: string;
    phoneNumber?: string | null;
    roleType?: 'STAFF' | 'COLLECTOR' | 'ACCOUNTANT' | 'TENANT_ADMIN';
    roleId?: string | null;
    isActive?: boolean;
    passwordHash?: string;
  } = {};
  if (fullName !== undefined) data.fullName = fullName.trim();
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber?.trim() || null;
  if (roleType !== undefined && ['STAFF', 'COLLECTOR', 'ACCOUNTANT', 'TENANT_ADMIN'].includes(roleType)) {
    data.roleType = roleType as any;
  }
  if (roleId !== undefined) {
    if (roleId && roleId.trim()) {
      const role = await prisma.role.findFirst({
        where: { id: roleId.trim(), tenantId: user.tenantId! },
      });
      if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      data.roleId = roleId.trim();
    } else {
      data.roleId = null;
    }
  }
  if (isActive !== undefined) data.isActive = !!isActive;
  if (password !== undefined && password !== '') {
    data.passwordHash = await hashPassword(password);
  }
  if (Array.isArray(directPermissionIds)) {
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    if (directPermissionIds.length > 0) {
      await prisma.userPermission.createMany({
        data: directPermissionIds.map((permissionId) => ({ userId: id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      roleType: true,
      roleId: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      directPermissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
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
  if (!userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }
  const target = await prisma.user.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.userPermission.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
