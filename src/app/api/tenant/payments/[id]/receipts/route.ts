import { NextResponse } from 'next/server';
import { getTenantUserOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId: user.tenantId! },
    include: { receipts: true },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  return NextResponse.json(payment.receipts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTenantUserOrNull(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized or tenant suspended' }, { status: 401 });
  if (!userHasPermission(user, PERMISSIONS.PAYMENTS_RECORD)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId: user.tenantId! },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { receiptNumber, url } = body as { receiptNumber?: string; url?: string };
  const receipt = await prisma.paymentReceipt.create({
    data: {
      paymentId,
      receiptNumber: receiptNumber?.trim() || null,
      url: url?.trim() || null,
    },
  });
  return NextResponse.json(receipt);
}
