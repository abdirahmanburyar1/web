import * as bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { prisma } from '@/lib/db';
import type { UserRole } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'aquatrack-dev-secret-change-in-production'
);
const JWT_ISSUER = 'aquatrack';
const JWT_AUDIENCE = 'aquatrack';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  sub: string;      // userId
  tenantId: string | null;
  role: UserRole;
  roleId: string | null;
  email: string;
  iat: number;
  exp: number;
}

export async function createToken(user: {
  id: string;
  tenantId: string | null;
  roleType: UserRole;
  roleId: string | null;
  email: string;
}): Promise<string> {
  return new jose.SignJWT({
    tenantId: user.tenantId,
    role: user.roleType,
    roleId: user.roleId,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return {
      sub: payload.sub as string,
      tenantId: (payload.tenantId as string) ?? null,
      role: payload.role as UserRole,
      roleId: (payload.roleId as string) ?? null,
      email: payload.email as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function getAuthFromRequest(req: Request): Promise<JWTPayload | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/** Get full user and ensure tenant is not suspended (for tenant/collector routes). */
export async function getTenantUserOrNull(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload?.tenantId) return null;
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, tenantId: payload.tenantId, isActive: true },
    include: {
      tenant: true,
      role: { include: { permissions: { include: { permission: true } } } },
      directPermissions: { include: { permission: true } },
    },
  });
  if (!user?.tenant || user.tenant.status !== 'ACTIVE') return null;
  return user;
}

/** Platform admin only. */
export async function getPlatformAdminOrNull(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== 'PLATFORM_ADMIN') return null;
  return prisma.user.findFirst({
    where: { id: payload.sub, isActive: true },
  });
}
