import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const limits = await prisma.planLimit.findMany({ orderBy: { plan: 'asc' } });
  return NextResponse.json(limits);
}
