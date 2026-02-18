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
    include: { receipts: { include: { receivedBy: { select: { fullName: true } } } } },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const receipts = payment.receipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    amount: Number(r.amount),
    paymentAccount: r.paymentAccount ?? null,
    receivedBy: r.receivedBy?.fullName ?? null,
    paidAt: r.paidAt,
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
  const { amountReceived, amount: amountBody, account } = body as {
    amountReceived?: number;
    amount?: number;
    account?: string | null;
  };
  const amount =
    (amountBody != null && Number.isFinite(amountBody)) ||
    (amountReceived != null && Number.isFinite(amountReceived))
      ? (Number.isFinite(amountBody) ? amountBody! : amountReceived!)
      : Number(payment.amount);
  const paymentAccount = typeof account === 'string' ? account.trim() || null : null;

  const tenantId = payment.tenantId;
  const existing = await prisma.paymentReceipt.findMany({
    where: { payment: { tenantId } },
    select: { receiptNumber: true },
  });
  const numbers = existing
    .map((r) => r.receiptNumber)
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n.replace(/^R-0*/, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  const receiptNumber = `R-${String(nextNum).padStart(6, '0')}`;

  const [receipt] = await prisma.$transaction(async (tx) => {
    const r = await tx.paymentReceipt.create({
      data: {
        tenantId,
        paymentId,
        receiptNumber,
        amount,
        paymentAccount,
        receivedById: user.id,
      },
    });
    const receipts = await tx.paymentReceipt.findMany({
      where: { paymentId },
      select: { amount: true },
    });
    const paidTotal = receipts.reduce((sum, x) => sum + Number(x.amount), 0);
    const paymentAmount = Number(payment.amount);
    const newStatus =
      paidTotal >= paymentAmount ? 'PAID' : paidTotal > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: newStatus },
    });
    return [r] as const;
  });

  return NextResponse.json({
    ...receipt,
    amount: Number(receipt.amount),
    paymentAccount: receipt.paymentAccount ?? null,
    receivedBy: user.fullName,
  });
}
