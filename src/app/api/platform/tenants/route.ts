import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, meters: true, payments: true } },
      },
    }),
    prisma.tenant.count(),
  ]);
  return NextResponse.json({ tenants, total, page, limit });
}

export async function POST(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const {
      name,
      slug,
      subscriptionPlan,
      adminEmail,
      adminPassword,
      adminFullName,
      maxStaff,
      maxCustomers,
      maxTransactions,
    } = body as {
      name: string;
      slug: string;
      subscriptionPlan?: string;
      adminEmail: string;
      adminPassword: string;
      adminFullName: string;
      maxStaff?: number;
      maxCustomers?: number;
      maxTransactions?: number;
    };
    if (!name || !slug || !adminEmail || !adminPassword || !adminFullName) {
      return NextResponse.json(
        { error: 'name, slug, adminEmail, adminPassword, adminFullName required' },
        { status: 400 }
      );
    }
    const slugNorm = slug.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await prisma.tenant.findUnique({ where: { slug: slugNorm } });
    if (existing) {
      return NextResponse.json({ error: 'Tenant slug already exists' }, { status: 400 });
    }
    const emailNorm = adminEmail.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existingUser) {
      return NextResponse.json({ error: 'Admin email already registered' }, { status: 400 });
    }
    const passwordHash = await hashPassword(adminPassword);
    const plan = subscriptionPlan ?? 'BASIC';
    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        slug: slugNorm,
        subscriptionPlan: plan as 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE',
        maxStaff: maxStaff ?? null,
        maxCustomers: maxCustomers ?? null,
        maxTransactions: maxTransactions ?? null,
        users: {
          create: {
            email: emailNorm,
            passwordHash,
            fullName: adminFullName.trim(),
            roleType: 'TENANT_ADMIN',
            isActive: true,
          },
        },
      },
      include: {
        users: { select: { id: true, email: true, fullName: true, roleType: true } },
      },
    });
    return NextResponse.json(tenant);
  } catch (e) {
    console.error('Create tenant error', e);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
