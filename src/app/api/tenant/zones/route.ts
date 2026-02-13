import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getTenantUserOrNull(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const subSectionId = searchParams.get('subSectionId')?.trim();
    const zones = await prisma.zone.findMany({
      where: {
        tenantId: user.tenantId!,
        ...(subSectionId ? { subSectionId } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { meters: true } },
        subSection: { select: { id: true, name: true, section: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json(zones);
  } catch (err) {
    console.error('[GET /api/tenant/zones]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load zones' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getTenantUserOrNull(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { name, description, subSectionId } = body as { name?: string; description?: string; subSectionId?: string };
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (subSectionId) {
      const subSection = await prisma.subSection.findFirst({
        where: { id: subSectionId, tenantId: user.tenantId! },
      });
      if (!subSection) return NextResponse.json({ error: 'Sub-section not found' }, { status: 400 });
    }
    const zone = await prisma.zone.create({
      data: {
        tenantId: user.tenantId!,
        name: name.trim(),
        description: description?.trim() || null,
        subSectionId: subSectionId?.trim() || null,
      },
      include: { subSection: { select: { id: true, name: true } } },
    });
    return NextResponse.json(zone);
  } catch (err) {
    console.error('[POST /api/tenant/zones]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create zone' },
      { status: 500 }
    );
  }
}
