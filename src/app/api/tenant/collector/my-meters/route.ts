import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Returns meters assigned to the current user. Collectors only. */
export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (user.roleType !== 'COLLECTOR') {
    return NextResponse.json({ error: 'Collectors only' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const searchRaw = searchParams.get('search')?.trim() ?? '';
  const terms = searchRaw.length > 0
    ? searchRaw.split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 0)
    : [];
  const tenantId = user.tenantId!;
  type OrItem = { meterNumber?: { contains: string; mode: 'insensitive' }; plateNumber?: { contains: string; mode: 'insensitive' } };
  const where: { tenantId: string; collectorId?: string; OR?: OrItem[] } = { tenantId };
  if (terms.length > 0) {
    const orClauses: OrItem[] = [];
    for (const term of terms) {
      orClauses.push({ meterNumber: { contains: term, mode: 'insensitive' } });
      orClauses.push({ plateNumber: { contains: term, mode: 'insensitive' } });
    }
    where.OR = orClauses;
  } else {
    where.collectorId = user.id;
  }
  const meters = await prisma.meter.findMany({
    where,
    orderBy: { meterNumber: 'asc' },
    take: limit,
    include: {
      zone: { select: { id: true, name: true } },
    },
  });
  const total = await prisma.meter.count({ where });
  return NextResponse.json({ meters, total });
}
