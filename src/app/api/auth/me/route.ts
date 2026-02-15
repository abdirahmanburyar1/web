import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      roleType: true,
      tenantId: true,
      roleId: true,
      tenant: { select: { id: true, name: true, status: true, slug: true } },
      role: { select: { id: true, name: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(user);
}
