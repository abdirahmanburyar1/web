"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentDetailSkeleton } from "@/components/ui/skeleton";

type PaymentDetail = {
  id: string;
  paymentNumber: string | null;
  amount: number;
  method: string;
  status?: string;
  reference: string | null;
  recordedAt: string;
  meter?: { id: string; meterNumber: string; customerName: string } | null;
  collector?: { id: string; fullName: string } | null;
  invoice?: { id: string; amount: unknown; balance: unknown; status: string } | null;
  receipts: Array<{
    id: string;
    receiptNumber: string | null;
    amount: number;
    paymentAccount: string | null;
    receivedBy: string | null;
    paidAt: string;
    createdAt?: string;
  }>;
};
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

function paymentStatusLabel(p: { status?: string; invoice?: { balance: unknown } | null }): string {
  const status = p.status;
  if (status === "PAID") return "Full";
  if (status === "PARTIALLY_PAID") return "Partial";
  if (status === "TRANSFERRED") return "Transferred";
  if (status === "REFUNDED") return "Refunded";
  if (status === "PENDING") return "Pending";
  if (p.invoice) {
    const balance = Number(p.invoice.balance);
    return balance <= 0 ? "Full" : "Partial";
  }
  return "—";
}

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Array<{ id: string; name: string; accountNumber: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addAccount, setAddAccount] = useState("");
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
        setMoneyAccounts(list.map((a: { id: string; name: string; accountNumber?: string | null }) => ({ id: a.id, name: a.name, accountNumber: a.accountNumber ?? null })));
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
    const paidSoFar = payment.receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const balanceDue = Math.round((Number(payment.amount) - paidSoFar) * 100) / 100;
    const amount = addAmount.trim() ? parseFloat(addAmount) : balanceDue;
    if (Number.isNaN(amount) || amount < 0) return;
    setAddingReceipt(true);
    fetch(`/api/tenant/payments/${id}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount, amountReceived: amount, account: addAccount || undefined }),
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
                      amount: receipt.amount ?? amount,
                      paymentAccount: receipt.paymentAccount ?? (addAccount || null),
                      receivedBy: receipt.receivedBy ?? null,
                      paidAt: receipt.paidAt ?? new Date().toISOString(),
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
    const paid = payment?.receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0) ?? 0;
    const balanceDue = payment ? Math.round((Number(payment.amount) - paid) * 100) / 100 : 0;
    setAddAmount(String(balanceDue));
    setAddAccount(moneyAccounts[0]?.name ?? "");
    setAddReceiptModalOpen(true);
  }

  function printMiniReceipt(
    receipt: { receiptNumber: string | null; amount: number; paymentAccount: string | null; paidAt: string },
    isPartial: boolean
  ) {
    if (!payment) return;
    const amount = receipt.amount ?? payment.amount;
    const method = receipt.paymentAccount ?? "—";
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
        <div>${RECEIPT_LABELS.date}: ${new Date(receipt.paidAt).toLocaleString()}</div>
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

  if (loading) return <PaymentDetailSkeleton />;
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

  const typeLabel = paymentStatusLabel(payment);
  const meterLabel = payment.meter ? `${payment.meter.meterNumber} — ${payment.meter.customerName}` : "—";
  const paidAmount = payment.receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
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

      {/* Page header: back link, title, actions */}
      <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/payments"
            className="mb-2 inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 dark:hover:text-teal-400"
          >
            ← Payments
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Payment #{payment.paymentNumber ?? payment.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meterLabel}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={printA4} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500">
            Print payment (A4)
          </Button>
          {balance > 0 && payment.status !== "TRANSFERRED" && payment.status !== "REFUNDED" && (
            <Button variant="secondary" size="sm" onClick={openAddReceiptModal} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20">
              Add receipt
            </Button>
          )}
        </div>
      </div>

      {/* Invoice-style payment details */}
      <div className="payment-detail-print rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        {/* Header: company left, PAYMENT # and date right */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tenantName || "Company Name"}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Payment record</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">PAYMENT</p>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">#{payment.paymentNumber ?? "—"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">DATE: {new Date(payment.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>

        {/* TO: customer / meter */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">TO:</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{payment.meter?.customerName ?? "—"}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Meter: {payment.meter?.meterNumber ?? "—"}</p>
        </div>

        {/* Metadata table: Collector, Reference, Account(s), Status */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <tbody>
              <tr>
                <th className="w-1/4 py-1 pr-4 text-left font-semibold text-slate-600 dark:text-slate-400">Collector</th>
                <td className="py-1 text-slate-900 dark:text-slate-100">{payment.collector?.fullName ?? "—"}</td>
                <th className="w-1/4 py-1 pr-4 text-left font-semibold text-slate-600 dark:text-slate-400">Reference</th>
                <td className="py-1 text-slate-900 dark:text-slate-100">{payment.reference || "—"}</td>
              </tr>
              <tr>
                <th className="py-1 pr-4 text-left font-semibold text-slate-600 dark:text-slate-400">Account(s)</th>
                <td className="py-1 text-slate-900 dark:text-slate-100">
                  {payment.receipts.length > 0
                    ? [...new Set(payment.receipts.map((r) => r.paymentAccount).filter(Boolean))].join(", ") || "—"
                    : "—"}
                </td>
                <th className="py-1 pr-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                <td className="py-1">
                  <span
                    className={
                      typeLabel === "Full"
                        ? "inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                        : typeLabel === "Partial"
                          ? "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : typeLabel === "Transferred"
                            ? "inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                            : typeLabel === "Refunded"
                              ? "inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                              : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }
                  >
                    {typeLabel}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Line items: receipts (Quantity, Description, Unit price, Total) */}
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Receipts</h2>
          {payment.receipts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
              No receipts yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Quantity</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Description</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">Unit price</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">Total</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Received by</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400 no-print">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900/20">
                  {payment.receipts.map((r, idx) => {
                    const amt = r.amount ?? payment.amount;
                    const isPartial = amt < payment.amount;
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {r.paymentAccount ? `Receipt ${r.receiptNumber ?? ""} — ${r.paymentAccount}`.trim() : `Receipt ${r.receiptNumber ?? "—"}`}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">${Number(amt).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">${Number(amt).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.receivedBy ?? "—"}</td>
                        <td className="px-4 py-3 text-right no-print">
                          <Button type="button" size="sm" variant="secondary" onClick={() => printMiniReceipt(r, isPartial)}>
                            Print
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

        {/* Financial summary: Amount, Paid, Balance */}
        <div className="flex justify-end px-6 py-4">
          <dl className="min-w-[200px] space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Amount</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">${Number(payment.amount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Paid</dt>
              <dd className="text-slate-700 dark:text-slate-300">${paidAmount.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
              <dt className="text-slate-700 dark:text-slate-300">Balance due</dt>
              <dd className="text-slate-900 dark:text-slate-100">${balance.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Thank you for your business.
        </div>
      </div>

      {addReceiptModalOpen && payment && (
        <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !addingReceipt && setAddReceiptModalOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Receipt payment receive</h3>
            <p className="mt-1 text-sm text-slate-500">Enter amount and account received for this receipt (full or partial).</p>
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
                <label className="block text-xs font-medium text-slate-500">Account</label>
                <select
                  value={addAccount}
                  onChange={(e) => setAddAccount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Select account —</option>
                  {moneyAccounts.map((a) => (
                    <option key={a.id} value={a.accountNumber ? `${a.name} (${a.accountNumber})` : a.name}>{a.name}{a.accountNumber ? ` (${a.accountNumber})` : ""}</option>
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
