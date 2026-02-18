import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

const meterInclude = {
  zone: { select: { id: true, name: true } },
  price: { select: { id: true, name: true, pricePerCubic: true } },
  collector: { select: { id: true, fullName: true } },
};

/** Collectors: list assigned meters, or exact search for one meter by meter number. */
export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (user.roleType !== 'COLLECTOR') {
    return NextResponse.json({ error: 'Collectors only' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const searchRaw = searchParams.get('search')?.trim() ?? '';
  const tenantId = user.tenantId!;

  if (searchRaw.length > 0) {
    // Exact match only (equals, not like): return at most one meter by meterNumber or plateNumber
    const meter = await prisma.meter.findFirst({
      where: {
        tenantId,
        OR: [
          { meterNumber: searchRaw },
          { plateNumber: searchRaw },
        ],
        collectorId: user.id,
      },
      include: meterInclude,
    });
    return NextResponse.json({ meters: meter ? [meter] : [], total: meter ? 1 : 0 });
  }

  // No search: return all meters assigned to this collector
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const meters = await prisma.meter.findMany({
    where: { tenantId, collectorId: user.id },
    orderBy: { meterNumber: 'asc' },
    take: limit,
    include: meterInclude,
  });
  const total = await prisma.meter.count({ where: { tenantId, collectorId: user.id } });
  return NextResponse.json({ meters, total });
}
