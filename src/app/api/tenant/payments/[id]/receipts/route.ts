import { NextResponse } from 'next/server';
import type { PaymentMethod } from '@prisma/client';
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
  const receipts = payment.receipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    amountReceived: r.amountReceived != null ? Number(r.amountReceived) : null,
    paymentMethod: r.paymentMethod,
    url: r.url,
    issuedAt: r.issuedAt,
    createdAt: r.createdAt,
  }));
  return NextResponse.json(receipts);
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
  const {
    receiptNumber,
    amountReceived,
    paymentMethod,
    url,
  } = body as {
    receiptNumber?: string;
    amountReceived?: number;
    paymentMethod?: string;
    url?: string;
  };
  const amount =
    amountReceived != null && Number.isFinite(amountReceived)
      ? amountReceived
      : Number(payment.amount);
  const method: PaymentMethod =
    paymentMethod && ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'].includes(paymentMethod)
      ? (paymentMethod as PaymentMethod)
      : payment.method;
  const receipt = await prisma.paymentReceipt.create({
    data: {
      paymentId,
      receiptNumber: receiptNumber?.trim() || null,
      amountReceived: amount,
      paymentMethod: method,
      url: url?.trim() || null,
    },
  });
  return NextResponse.json({
    ...receipt,
    amountReceived: receipt.amountReceived != null ? Number(receipt.amountReceived) : null,
    paymentMethod: receipt.paymentMethod,
  });
}
