"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentDetail = {
  id: string;
  paymentNumber: string | null;
  amount: number;
  method: string;
  reference: string | null;
  recordedAt: string;
  meter?: { id: string; meterNumber: string; customerName: string } | null;
  collector?: { id: string; fullName: string } | null;
  invoice?: { id: string; amount: unknown; balance: unknown; status: string } | null;
  receipts: Array<{
    id: string;
    receiptNumber: string | null;
    amountReceived: number | null;
    paymentMethod: string | null;
    issuedAt: string;
    createdAt?: string;
  }>;
};

const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"] as const;
const METHOD_SOMALI: Record<string, string> = {
  CASH: "Lacag cad",
  MOBILE_MONEY: "Lacag mobil",
  BANK_TRANSFER: "Wareejinta bangiga",
  OTHER: "Kale",
};
const RECEIPT_LABELS = {
  company: "Warqad Lacag",
  receiptNo: "Lambarka warqadda",
  date: "Taariikh",
  paymentNo: "Lambarka lacag-bixinta",
  customer: "Macmiil",
  amount: "Qadarka lacagta",
  method: "Habka bixinta",
  partial: "Bixinta qaybsan",
  full: "Bixinta buuxda",
  thanks: "Mahadsanid",
};

function paymentType(p: { invoice?: { balance: unknown } | null }): "Full" | "Partial" | "—" {
  if (!p.invoice) return "—";
  const balance = Number(p.invoice.balance);
  return balance <= 0 ? "Full" : "Partial";
}

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Array<{ name: string; accountNumber: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addMethod, setAddMethod] = useState("CASH");
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t || !id) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/tenant/payments/${id}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/tenant/money-accounts", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    ])
      .then(([payData, meData, accData]) => {
        if (payData?.error || !payData?.id) {
          setError(payData?.error || "Payment not found");
          return;
        }
        setPayment(payData);
        setAddAmount(String(payData.amount ?? ""));
        if (meData?.tenant?.name) setTenantName(meData.tenant.name);
        const list = Array.isArray(accData) ? accData : [];
        setMoneyAccounts(list.map((a: { name: string; accountNumber: string | null }) => ({ name: a.name, accountNumber: a.accountNumber ?? null })));
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
  }, [id]);

  function handleAddReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!payment || !getToken() || addingReceipt) return;
    const amount = addAmount.trim() ? parseFloat(addAmount) : payment.amount;
    if (Number.isNaN(amount) || amount < 0) return;
    setAddingReceipt(true);
    fetch(`/api/tenant/payments/${id}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amountReceived: amount, paymentMethod: addMethod }),
    })
      .then((r) => r.json())
      .then((receipt) => {
        if (receipt.id)
          setPayment((prev) =>
            prev
              ? {
                  ...prev,
                  receipts: [
                    ...prev.receipts,
                    {
                      id: receipt.id,
                      receiptNumber: receipt.receiptNumber,
                      amountReceived: receipt.amountReceived ?? amount,
                      paymentMethod: receipt.paymentMethod ?? addMethod,
                      issuedAt: receipt.issuedAt ?? new Date().toISOString(),
                      createdAt: receipt.createdAt,
                    },
                  ],
                }
              : null
          );
        setAddAmount(String(payment.amount));
        setAddReceiptModalOpen(false);
      })
      .finally(() => setAddingReceipt(false));
  }

  function openAddReceiptModal() {
    setAddAmount(String(payment?.amount ?? ""));
    setAddMethod("CASH");
    setAddReceiptModalOpen(true);
  }

  function printMiniReceipt(
    receipt: { receiptNumber: string | null; amountReceived: number | null; paymentMethod: string | null; issuedAt: string },
    isPartial: boolean
  ) {
    if (!payment) return;
    const amount = receipt.amountReceived ?? payment.amount;
    const methodKey = (receipt.paymentMethod ?? payment.method) as string;
    const method = METHOD_SOMALI[methodKey] || methodKey.replace(/_/g, " ");
    const paymentTypeLabel = isPartial ? RECEIPT_LABELS.partial : RECEIPT_LABELS.full;
    const meterLabel = payment.meter ? `${payment.meter.meterNumber} — ${payment.meter.customerName}` : "—";
    const accountLines = moneyAccounts.map((a) => [a.name, a.accountNumber].filter(Boolean).join(" ").trim());
    const accountsSection =
      accountLines.length > 0
        ? `<div style="border-top: 1px solid #333; margin-top: 10px; padding-top: 8px; font-size: 11px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Lacag bixi (Xarumaha):</div>
          ${accountLines.map((line) => `<div>${line}</div>`).join("")}
        </div>`
        : "";
    const receiptBody = `
      <div style="width: 80mm; max-width: 300px; margin: 0 auto; padding: 16px; font-family: monospace; font-size: 12px; border: 1px dashed #999;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 14px;">${tenantName || RECEIPT_LABELS.company}</div>
        <div style="border-bottom: 1px solid #333; margin-bottom: 8px;"></div>
        <div>${RECEIPT_LABELS.receiptNo}: ${receipt.receiptNumber || "—"}</div>
        <div>${RECEIPT_LABELS.date}: ${new Date(receipt.issuedAt).toLocaleString()}</div>
        <div>${RECEIPT_LABELS.paymentNo}: ${payment.paymentNumber ?? "—"}</div>
        <div>${RECEIPT_LABELS.customer}: ${meterLabel}</div>
        <div style="margin: 8px 0;">${RECEIPT_LABELS.amount}: $${Number(amount).toFixed(2)}</div>
        <div>${RECEIPT_LABELS.method}: ${method}</div>
        <div>${paymentTypeLabel}</div>
        ${accountsSection}
        <div style="border-top: 1px solid #333; margin-top: 12px; padding-top: 8px; text-align: center; font-size: 10px;">${RECEIPT_LABELS.thanks}</div>
      </div>
    `;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Warqad Lacag ${receipt.receiptNumber || ""}</title></head><body style="margin:0;">${receiptBody}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function printA4() {
    window.print();
  }

  if (loading) return <PageLoading />;
  if (error || !payment) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error || "Payment not found"}</p>
        <Link href="/payments" className="mt-4 inline-block">
          <Button variant="secondary">Back to payments</Button>
        </Link>
      </div>
    );
  }

  const typeLabel = paymentType(payment);
  const meterLabel = payment.meter ? `${payment.meter.meterNumber} — ${payment.meter.customerName}` : "—";
  const paidAmount = payment.receipts.reduce((sum, r) => sum + Number(r.amountReceived ?? 0), 0);
  const balance = Math.round((Number(payment.amount) - paidAmount) * 100) / 100;

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .payment-detail-print, .payment-detail-print * { visibility: visible; }
          .payment-detail-print { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; padding: 15mm; font-size: 11pt; box-shadow: none; border: 1px solid #ccc; }
          .no-print, .no-print * { display: none !important; visibility: hidden !important; }
          th.no-print, td.no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print mb-6">
        <PageHeader
          title={`Payment #${payment.paymentNumber ?? payment.id.slice(0, 8)}`}
          description={meterLabel}
          backLink={{ href: "/payments", label: "Payments" }}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="platform" size="sm" onClick={printA4}>
                Print payment (A4)
              </Button>
              <Button variant="secondary" size="sm" onClick={openAddReceiptModal}>
                Add receipt
              </Button>
            </div>
          }
        />
      </div>

      <div className="payment-detail-print rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-900">
            {tenantName || "Payment"} — Payment #{payment.paymentNumber ?? "—"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Recorded {new Date(payment.recordedAt).toLocaleString()}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Meter / Customer</dt>
              <dd className="font-medium text-slate-900">{meterLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Amount</dt>
              <dd className="text-lg font-semibold text-slate-900">${Number(payment.amount).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Paid (from receipts)</dt>
              <dd className="text-slate-700">${paidAmount.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Balance</dt>
              <dd className="font-medium text-slate-900">${balance.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Type</dt>
              <dd>
                <span
                  className={
                    typeLabel === "Full"
                      ? "rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800"
                      : typeLabel === "Partial"
                        ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        : "text-slate-500"
                  }
                >
                  {typeLabel}
                </span>
              </dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Collector</dt>
              <dd className="text-slate-700">{payment.collector?.fullName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Reference</dt>
              <dd className="text-slate-700">{payment.reference || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Receipts</h2>
          {payment.receipts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center text-sm text-slate-500">No receipts yet</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Receipt #</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Method</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Issued at</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600 no-print">Print (mini)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payment.receipts.map((r) => {
                    const amt = r.amountReceived ?? payment.amount;
                    const isPartial = amt < payment.amount;
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-mono text-slate-900">{r.receiptNumber || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">${Number(amt).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-600">{(r.paymentMethod ?? "").replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(r.issuedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right no-print">
                          <Button type="button" size="sm" variant="secondary" onClick={() => printMiniReceipt(r, isPartial)}>
                            Print (mini)
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {addReceiptModalOpen && payment && (
        <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !addingReceipt && setAddReceiptModalOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Receipt payment receive</h3>
            <p className="mt-1 text-sm text-slate-500">Enter amount and method received for this receipt (full or partial).</p>
            <form onSubmit={handleAddReceipt} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500">Amount received</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Payment method</label>
                <select
                  value={addMethod}
                  onChange={(e) => setAddMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAddReceiptModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addingReceipt}>{addingReceipt ? "Adding…" : "Add receipt"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
