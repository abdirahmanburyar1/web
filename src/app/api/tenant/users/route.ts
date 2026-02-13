import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.USERS_VIEW) && !userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxStaff: true },
  });
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { fullName: 'asc' },
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
    }),
    prisma.user.count({ where: { tenantId } }),
  ]);
  return NextResponse.json({ users, total, maxStaff: tenant?.maxStaff ?? null });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { maxStaff: true } });
  if (tenant?.maxStaff != null) {
    const count = await prisma.user.count({ where: { tenantId } });
    if (count >= tenant.maxStaff) {
      return NextResponse.json(
        { error: 'Staff limit reached for your plan' },
        { status: 403 }
      );
    }
  }
  const body = await req.json().catch(() => ({}));
  const {
    email,
    password,
    fullName,
    phoneNumber,
    roleType,
    roleId,
    directPermissionIds,
  } = body as {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    roleType?: string;
    roleId?: string | null;
    directPermissionIds?: string[];
  };
  if (!email?.trim() || !password || !fullName?.trim()) {
    return NextResponse.json(
      { error: 'email, password, and fullName required' },
      { status: 400 }
    );
  }
  const emailNorm = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }
  const roleTypeVal = (['STAFF', 'COLLECTOR', 'ACCOUNTANT', 'TENANT_ADMIN'] as const).includes(roleType as any)
    ? (roleType as 'STAFF' | 'COLLECTOR' | 'ACCOUNTANT' | 'TENANT_ADMIN')
    : 'STAFF';
  if (roleId && roleId.trim()) {
    const role = await prisma.role.findFirst({
      where: { id: roleId.trim(), tenantId },
    });
    if (!role) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
  }
  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      tenantId,
      email: emailNorm,
      passwordHash,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber?.trim() || null,
      roleType: roleTypeVal,
      roleId: roleId && roleId.trim() ? roleId.trim() : null,
      isActive: true,
      ...(Array.isArray(directPermissionIds) && directPermissionIds.length > 0
        ? {
            directPermissions: {
              create: directPermissionIds.map((permissionId) => ({ permissionId })),
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      roleType: true,
      roleId: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      directPermissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
    },
  });
  return NextResponse.json(created);
}
