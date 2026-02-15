import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username: usernameInput, password, tenantSlug } = body as {
      email?: string;
      username?: string;
      password?: string;
      tenantSlug?: string;
    };
    const passwordTrimmed = (password as string | undefined)?.trim();
    if (!passwordTrimmed) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    // Mobile (collector) app sends username; web can send email
    const byUsername = (usernameInput as string | undefined)?.trim();
    const byEmail = (email as string | undefined)?.trim()?.toLowerCase();
    if (!byUsername && !byEmail) {
      return NextResponse.json(
        { error: 'Username or email is required' },
        { status: 400 }
      );
    }
    let user = null;
    if (byUsername) {
      user = await prisma.user.findFirst({
        where: { username: byUsername, tenantId: { not: null } },
        include: { tenant: true },
      });
    }
    if (!user && byEmail) {
      user = await prisma.user.findUnique({
        where: { email: byEmail },
        include: { tenant: true },
      });
    }
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const ok = await verifyPassword(passwordTrimmed, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }
    const requestedSlug = (tenantSlug as string | undefined)?.trim()?.toLowerCase();
    if (requestedSlug && requestedSlug.length > 0) {
      if (!user.tenantId || !user.tenant) {
        return NextResponse.json(
          { error: 'This app is configured for a specific tenant. Your account is not in that tenant.' },
          { status: 403 }
        );
      }
      const userSlug = user.tenant.slug?.toLowerCase();
      if (userSlug !== requestedSlug) {
        return NextResponse.json(
          { error: `This app is configured for tenant "${requestedSlug}". Your account belongs to a different tenant.` },
          { status: 403 }
        );
      }
    }
    // Tenant users: block if tenant is suspended
    if (user.tenantId && user.tenant?.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Tenant is suspended. Access disabled.' },
        { status: 403 }
      );
    }
    const token = await createToken({
      id: user.id,
      tenantId: user.tenantId,
      roleType: user.roleType,
      roleId: user.roleId,
      email: user.email,
    });
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roleType: user.roleType,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug ?? null,
        tenantName: user.tenant?.name,
        tenantStatus: user.tenant?.status,
      },
    });
  } catch (e) {
    console.error('Login error', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
