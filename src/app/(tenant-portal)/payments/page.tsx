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
  url: string | null;
  issuedAt: string;
}

export default function PaymentsPage() {
  const [data, setData] = useState<{ payments: Payment[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptsModal, setReceiptsModal] = useState<{ paymentId: string; meterLabel: string } | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [addReceiptNumber, setAddReceiptNumber] = useState("");
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

  function openReceipts(paymentId: string, meterLabel: string) {
    setReceiptsModal({ paymentId, meterLabel });
    setReceipts([]);
    setAddReceiptNumber("");
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
    setAddingReceipt(true);
    fetch(`/api/tenant/payments/${receiptsModal.paymentId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ receiptNumber: addReceiptNumber.trim() || undefined, url: addReceiptUrl.trim() || undefined }),
    })
      .then((r) => r.json())
      .then((receipt) => {
        if (receipt.id) setReceipts((prev) => [receipt, ...prev]);
        setAddReceiptNumber("");
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
                    onClick={() => openReceipts(p.id, p.meter ? `${p.meter.meterNumber} — ${p.meter.customerName}` : "Payment")}
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Receipts — {receiptsModal.meterLabel}</h2>
              <p className="text-sm text-slate-500">One payment can have more than one receipt.</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4">
              <form onSubmit={handleAddReceipt} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="min-w-[120px] flex-1">
                  <label className="block text-xs font-medium text-slate-500">Receipt number</label>
                  <input
                    value={addReceiptNumber}
                    onChange={(e) => setAddReceiptNumber(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="min-w-[120px] flex-1">
                  <label className="block text-xs font-medium text-slate-500">URL</label>
                  <input
                    value={addReceiptUrl}
                    onChange={(e) => setAddReceiptUrl(e.target.value)}
                    placeholder="Optional link"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" size="sm" disabled={addingReceipt}>{(addingReceipt ? "Adding…" : "Add receipt")}</Button>
              </form>
              {loadingReceipts ? (
                <p className="text-slate-500">Loading receipts…</p>
              ) : receipts.length === 0 ? (
                <p className="text-slate-500">No receipts yet. Add one above.</p>
              ) : (
                <ul className="space-y-2">
                  {receipts.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                      <span className="text-slate-700">{r.receiptNumber || "—"}</span>
                      <span className="text-slate-500">{new Date(r.issuedAt).toLocaleString()}</span>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Open</a>
                      ) : null}
                    </li>
                  ))}
                </ul>
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
