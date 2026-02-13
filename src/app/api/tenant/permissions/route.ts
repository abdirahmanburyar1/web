import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

/** List all platform permissions (for assigning to roles/users). */
export async function GET(req: Request) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.ROLES_MANAGE) && !userHasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const list = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
    select: { id: true, code: true, name: true, module: true },
  });
  return NextResponse.json(list);
}
