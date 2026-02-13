import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const setting = await prisma.platformSetting.findUnique({ where: { id } });
  if (!setting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(setting);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key?: string; value?: unknown };
  const data: { key?: string; value?: unknown } = {};
  if (key !== undefined) data.key = key.trim();
  if (value !== undefined) data.value = value;
  const setting = await prisma.platformSetting.update({
    where: { id },
    data,
  });
  return NextResponse.json(setting);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  await prisma.platformSetting.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
