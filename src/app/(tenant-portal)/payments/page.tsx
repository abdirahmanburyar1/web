"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  amount: number;
  method: string;
  meter?: { meterNumber: string; customerName: string };
  recordedAt: string;
  _count?: { receipts: number };
};

type Receipt = {
  id: string;
  receiptNumber: string | null;
  amountReceived: number | null;
  paymentMethod: string | null;
  url: string | null;
  issuedAt: string;
  createdAt?: string;
};

const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"] as const;

export default function PaymentsPage() {
  const [data, setData] = useState<{ payments: Payment[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptsModal, setReceiptsModal] = useState<{
    paymentId: string;
    meterLabel: string;
    paymentAmount: number;
    paymentMethod: string;
  } | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [addReceiptNumber, setAddReceiptNumber] = useState("");
  const [addAmountReceived, setAddAmountReceived] = useState("");
  const [addPaymentMethod, setAddPaymentMethod] = useState<string>("CASH");
  const [addReceiptUrl, setAddReceiptUrl] = useState("");
  const [addingReceipt, setAddingReceipt] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/payments?limit=50", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
    setLoading(false);
  }, []);

  function openReceipts(paymentId: string, meterLabel: string, paymentAmount: number, paymentMethod: string) {
    setReceiptsModal({ paymentId, meterLabel, paymentAmount, paymentMethod });
    setReceipts([]);
    setAddReceiptNumber("");
    setAddAmountReceived(String(paymentAmount));
    setAddPaymentMethod(paymentMethod || "CASH");
    setAddReceiptUrl("");
    const t = getToken();
    if (!t) return;
    setLoadingReceipts(true);
    fetch(`/api/tenant/payments/${paymentId}/receipts`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((list) => {
        setReceipts(Array.isArray(list) ? list : []);
      })
      .catch(() => setReceipts([]))
      .finally(() => setLoadingReceipts(false));
  }

  function handleAddReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptsModal || !getToken() || addingReceipt) return;
    const amount = addAmountReceived.trim() ? parseFloat(addAmountReceived) : receiptsModal.paymentAmount;
    if (Number.isNaN(amount) || amount < 0) return;
    setAddingReceipt(true);
    fetch(`/api/tenant/payments/${receiptsModal.paymentId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        receiptNumber: addReceiptNumber.trim() || undefined,
        amountReceived: amount,
        paymentMethod: addPaymentMethod,
        url: addReceiptUrl.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((receipt) => {
        if (receipt.id) setReceipts((prev) => [receipt, ...prev]);
        setAddReceiptNumber("");
        setAddAmountReceived(String(receiptsModal.paymentAmount));
        setAddPaymentMethod(receiptsModal.paymentMethod || "CASH");
        setAddReceiptUrl("");
        load();
      })
      .finally(() => setAddingReceipt(false));
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !data) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-teal-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  const payments = data?.payments ?? [];
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      <p className="mt-1 text-slate-500">Payment history. One payment can have multiple receipts.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Meter / Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Receipts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm text-slate-900">{p.meter ? `${p.meter.meterNumber} — ${p.meter.customerName}` : "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">${Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.method}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.recordedAt ? new Date(p.recordedAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openReceipts(p.id, p.meter ? `${p.meter.meterNumber} — ${p.meter.customerName}` : "Payment", Number(p.amount), p.method)}
                    className="text-sm font-medium text-teal-600 hover:underline"
                  >
                    {p._count?.receipts ?? 0} receipt{(p._count?.receipts ?? 0) !== 1 ? "s" : ""}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-sm text-slate-500">Total: {data?.total ?? 0}</p>
      </div>

      {receiptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setReceiptsModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Receipts — {receiptsModal.meterLabel}</h2>
              <p className="text-sm text-slate-500">
                Payment recorded in office: <strong>${receiptsModal.paymentAmount.toFixed(2)}</strong> · {receiptsModal.paymentMethod.replace(/_/g, " ")}. Add receipt records (receipt number, amount received, payment method) below.
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <form onSubmit={handleAddReceipt} className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-xs font-medium text-slate-600">Add receipt (office record)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Receipt number</label>
                    <input
                      value={addReceiptNumber}
                      onChange={(e) => setAddReceiptNumber(e.target.value)}
                      placeholder="e.g. R-001"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Amount received</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addAmountReceived}
                      onChange={(e) => setAddAmountReceived(e.target.value)}
                      placeholder={String(receiptsModal.paymentAmount)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Payment method</label>
                    <select
                      value={addPaymentMethod}
                      onChange={(e) => setAddPaymentMethod(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Link (optional)</label>
                    <input
                      value={addReceiptUrl}
                      onChange={(e) => setAddReceiptUrl(e.target.value)}
                      placeholder="URL to receipt"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="submit" size="sm" disabled={addingReceipt}>{(addingReceipt ? "Adding…" : "Add receipt")}</Button>
                </div>
              </form>
              {loadingReceipts ? (
                <p className="text-slate-500">Loading receipts…</p>
              ) : receipts.length === 0 ? (
                <p className="text-slate-500">No receipts yet. Add one above.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Receipt #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Amount received</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Method</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {receipts.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 text-slate-900">{r.receiptNumber || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">${(r.amountReceived ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-slate-600">{(r.paymentMethod ?? "").replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(r.issuedAt).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Open</a>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-4 py-3">
              <Button type="button" variant="secondary" onClick={() => setReceiptsModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
