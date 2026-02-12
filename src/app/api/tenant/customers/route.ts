import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  const search = searchParams.get('search')?.trim();
  const zoneId = searchParams.get('zoneId')?.trim();
  const where = {
    tenantId: user.tenantId!,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { meterNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(zoneId ? { zoneId } : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fullName: 'asc' },
      include: { zone: { select: { id: true, name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);
  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.CUSTOMERS_CREATE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenantId = user.tenantId!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (tenant?.maxCustomers != null) {
    const count = await prisma.customer.count({ where: { tenantId } });
    if (count >= tenant.maxCustomers) {
      return NextResponse.json(
        { error: 'Customer limit reached for your plan' },
        { status: 403 }
      );
    }
  }
  const body = await req.json();
  const { fullName, email, phoneNumber, address, meterNumber, zoneId } = body as {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    meterNumber?: string;
    zoneId?: string;
  };
  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'fullName required' }, { status: 400 });
  }
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      fullName: fullName.trim(),
      email: email?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      address: address?.trim() || null,
      meterNumber: meterNumber?.trim() || null,
      zoneId: zoneId || null,
    },
    include: { zone: { select: { id: true, name: true } } },
  });
  return NextResponse.json(customer);
}
