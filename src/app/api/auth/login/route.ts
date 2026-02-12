import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { tenant: true },
    });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
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
        fullName: user.fullName,
        roleType: user.roleType,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        tenantStatus: user.tenant?.status,
      },
    });
  } catch (e) {
    console.error('Login error', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
