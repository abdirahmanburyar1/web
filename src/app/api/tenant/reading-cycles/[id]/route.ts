import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const { id } = await params;
  const cycle = await prisma.readingCycle.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: { _count: { select: { readings: true } } },
  });
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(cycle);
}

/** Close the cycle: no new readings can be added for this period. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { isClosed } = body as { isClosed?: boolean };
  const cycle = await prisma.readingCycle.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (cycle.isClosed) {
    return NextResponse.json({ error: 'Cycle is already closed' }, { status: 400 });
  }
  const updated = await prisma.readingCycle.update({
    where: { id },
    data: isClosed === true ? { isClosed: true, closedAt: new Date() } : {},
    include: { _count: { select: { readings: true } } },
  });
  return NextResponse.json(updated);
}
