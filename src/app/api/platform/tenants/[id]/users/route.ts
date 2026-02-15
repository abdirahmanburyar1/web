import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, fullName: true, roleType: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { email, fullName, password, roleType } = body as {
    email?: string;
    fullName?: string;
    password?: string;
    roleType?: string;
  };
  if (!email?.trim() || !fullName?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: 'email, fullName, and password required' },
      { status: 400 }
    );
  }
  const emailNorm = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }
  const role = roleType === 'TENANT_ADMIN' ? 'TENANT_ADMIN' : 'TENANT_ADMIN';
  const passwordHash = await hashPassword(password.trim());
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: emailNorm,
      fullName: fullName.trim(),
      passwordHash,
      roleType: role,
      isActive: true,
    },
    select: { id: true, email: true, fullName: true, roleType: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}
