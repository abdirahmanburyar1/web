import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get('sectionId')?.trim();
  const subSections = await prisma.subSection.findMany({
    where: {
      tenantId: user.tenantId!,
      ...(sectionId ? { sectionId } : {}),
    },
    orderBy: { name: 'asc' },
    include: { section: { select: { id: true, name: true } } },
  });
  return NextResponse.json(subSections);
}

export async function POST(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, description, sectionId } = body as { name?: string; description?: string; sectionId?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (sectionId) {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, tenantId: user.tenantId! },
    });
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 400 });
  }
  const subSection = await prisma.subSection.create({
    data: {
      tenantId: user.tenantId!,
      name: name.trim(),
      description: description?.trim() || null,
      sectionId: sectionId?.trim() || null,
    },
    include: { section: { select: { id: true, name: true } } },
  });
  return NextResponse.json(subSection);
}
