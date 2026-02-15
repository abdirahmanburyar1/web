import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await prisma.platformSetting.findMany({
    orderBy: { key: 'asc' },
  });
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key?: string; value?: unknown };
  if (!key || typeof key !== 'string' || !key.trim()) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  const jsonValue: Prisma.InputJsonValue = value !== undefined && value !== null ? value : Prisma.JsonNull;
  const setting = await prisma.platformSetting.create({
    data: { key: key.trim(), value: jsonValue },
  });
  return NextResponse.json(setting);
}
