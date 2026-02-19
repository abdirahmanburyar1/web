import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const tenantId = user.tenantId!;
  const cycles = await prisma.readingCycle.findMany({
    where: { tenantId },
    orderBy: { endDate: 'desc' },
    include: { _count: { select: { readings: true } } },
  });
  return NextResponse.json(cycles);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, startDate, endDate } = body as { name?: string; startDate?: string; endDate?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'startDate and endDate required (valid ISO dates)' }, { status: 400 });
  }
  if (start > end) {
    return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
  }
  const cycle = await prisma.readingCycle.create({
    data: {
      tenantId: user.tenantId!,
      name: name.trim(),
      startDate: start,
      endDate: end,
    },
    include: { _count: { select: { readings: true } } },
  });
  return NextResponse.json(cycle);
}
