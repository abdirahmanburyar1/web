import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key: string; value: unknown };
  if (!key || typeof key !== 'string' || !key.trim()) {
    return NextResponse.json({ error: 'key required' }, { status: 400 });
  }
  const existing = await prisma.platformSetting.findUnique({ where: { key: key.trim() } });
  if (existing) return NextResponse.json({ error: 'Setting key already exists' }, { status: 400 });
  const setting = await prisma.platformSetting.create({
    data: {
      key: key.trim(),
      value: value != null ? (value as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
  return NextResponse.json(setting);
}
