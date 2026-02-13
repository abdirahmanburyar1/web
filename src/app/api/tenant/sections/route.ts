import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getTenantUserOrNull(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
    const sections = await prisma.section.findMany({
      where: { tenantId: user.tenantId! },
      orderBy: { name: 'asc' },
      include: { _count: { select: { subSections: true } } },
    });
    return NextResponse.json(sections);
  } catch (err) {
    console.error('[GET /api/tenant/sections]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load sections' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getTenantUserOrNull(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { name, description } = body as { name?: string; description?: string };
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const section = await prisma.section.create({
      data: {
        tenantId: user.tenantId!,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
    return NextResponse.json(section);
  } catch (err) {
    console.error('[POST /api/tenant/sections]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create section' },
      { status: 500 }
    );
  }
}
