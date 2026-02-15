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
  const meters = await prisma.meter.findMany({
    where: { tenantId: user.tenantId!, collectorId: user.id },
    orderBy: { meterNumber: 'asc' },
    take: limit,
    include: {
      zone: { select: { id: true, name: true } },
    },
  });
  const total = await prisma.meter.count({
    where: { tenantId: user.tenantId!, collectorId: user.id },
  });
  return NextResponse.json({ meters, total });
}
