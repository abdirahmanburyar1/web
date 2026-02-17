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
  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      meter: { select: { id: true, meterNumber: true, customerName: true } },
      collector: { select: { id: true, fullName: true } },
      invoice: { select: { id: true, amount: true, balance: true, status: true } },
      receipts: { orderBy: { issuedAt: 'asc' } },
    },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const receipts = payment.receipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    amountReceived: r.amountReceived != null ? Number(r.amountReceived) : null,
    paymentMethod: r.paymentMethod,
    issuedAt: r.issuedAt,
    createdAt: r.createdAt,
  }));
  return NextResponse.json({
    ...payment,
    amount: Number(payment.amount),
    receipts,
  });
}
