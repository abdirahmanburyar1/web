import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId, paymentId } = await params;
  const payment = await prisma.platformPayment.findFirst({
    where: { id: paymentId, tenantId },
    include: { receipts: true },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  return NextResponse.json(payment.receipts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id: tenantId, paymentId } = await params;
  const payment = await prisma.platformPayment.findFirst({
    where: { id: paymentId, tenantId },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { receiptNumber, url } = body as { receiptNumber?: string; url?: string };
  const receipt = await prisma.platformReceipt.create({
    data: {
      platformPaymentId: paymentId,
      receiptNumber: receiptNumber?.trim() || null,
      url: url?.trim() || null,
    },
  });
  return NextResponse.json(receipt);
}
