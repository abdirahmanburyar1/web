import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PLAN_VALUES = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ plan: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { plan } = await params;
  if (!PLAN_VALUES.includes(plan as typeof PLAN_VALUES[number])) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const { maxStaff, maxCustomers, maxTransactions } = body as {
    maxStaff?: number | null;
    maxCustomers?: number | null;
    maxTransactions?: number | null;
  };
  const data: { maxStaff?: number | null; maxCustomers?: number | null; maxTransactions?: number | null } = {};
  if (maxStaff !== undefined) data.maxStaff = maxStaff;
  if (maxCustomers !== undefined) data.maxCustomers = maxCustomers;
  if (maxTransactions !== undefined) data.maxTransactions = maxTransactions;
  const planEnum = plan as 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  const updated = await prisma.planLimit.upsert({
    where: { plan: planEnum },
    create: {
      plan: planEnum,
      maxStaff: data.maxStaff ?? null,
      maxCustomers: data.maxCustomers ?? null,
      maxTransactions: data.maxTransactions ?? null,
    },
    update: data,
  });
  return NextResponse.json(updated);
}
