"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableWrapper } from "@/components/ui/table-responsive";

type Payment = {
  id: string;
  paymentNumber: string | null;
  amount: number | string;
  method: string;
  reference: string | null;
  recordedAt: string;
  meter?: { id: string; meterNumber: string; customerName: string } | null;
  collector?: { id: string; fullName: string } | null;
  invoice?: { id: string; amount: number | string; balance: number | string; status: string } | null;
  _count?: { receipts: number };
};

type Receipt = {
  id: string;
  receiptNumber: string | null;
  amountReceived: number | null;
  paymentMethod: string | null;
  issuedAt: string;
  createdAt?: string;
};

const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"] as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;

function paymentType(p: Payment): "Full" | "Partial" | "—" {
  if (!p.invoice) return "—";
  const balance = Number(p.invoice.balance);
  return balance <= 0 ? "Full" : "Partial";
}

export default function PaymentsPage() {
  const [data, setData] = useState<{ payments: Payment[]; total: number; page: number; limit: number; totalAmount?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [meterId, setMeterId] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meters, setMeters] = useState<Array<{ id: string; meterNumber: string; customerName: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; fullName: string }>>([]);
  const [tenantName, setTenantName] = useState("");
  // Snapshot of account name + number only (no id); used as plain text on receipt so it stays correct if accounts are changed later
  const [moneyAccounts, setMoneyAccounts] = useState<Array<{ name: string; accountNumber: string | null }>>([]);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordMeterId, setRecordMeterId] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMethod, setRecordMethod] = useState("CASH");
  const [recordReference, setRecordReference] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [receiptsModal, setReceiptsModal] = useState<{
    paymentId: string;
    paymentNumber: string | null;
    meterLabel: string;
    paymentAmount: number;
    paymentMethod: string;
    paymentRecordedAt: string;
  } | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [addAmountReceived, setAddAmountReceived] = useState("");
  const [addPaymentMethod, setAddPaymentMethod] = useState<string>("CASH");
  const [addingReceipt, setAddingReceipt] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const loadPayments = useCallback(() => {
    const t = getToken();
    if (!t) return;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (meterId) params.set("meterId", meterId);
    if (collectorId) params.set("collectorId", collectorId);
    if (method) params.set("method", method);
    setLoading(true);
    fetch(`/api/tenant/payments?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ payments: d.payments ?? [], total: d.total ?? 0, page: d.page ?? page, limit: d.limit ?? limit, totalAmount: d.totalAmount ?? 0 });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [page, limit, from, to, meterId, collectorId, method]);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((me) => {
        if (me?.tenant?.name) setTenantName(me.tenant.name);
      })
      .catch(() => {});
    fetch("/api/tenant/meters?limit=500", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setMeters(d?.meters ?? []))
      .catch(() => {});
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setCollectors(d?.users ?? []))
      .catch(() => {});
    fetch("/api/tenant/money-accounts", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setMoneyAccounts(list.map((a: { name: string; accountNumber: string | null }) => ({ name: a.name, accountNumber: a.accountNumber ?? null })));
      })
      .catch(() => {});
  }, []);

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !recordMeterId || !recordAmount || Number(recordAmount) <= 0) return;
    setRecordSubmitting(true);
    setRecordError("");
    fetch("/api/tenant/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        meterId: recordMeterId,
        amount: Number(recordAmount),
        method: recordMethod,
        reference: recordReference.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setRecordError(d.error);
          return;
        }
        setRecordModalOpen(false);
        setRecordMeterId("");
        setRecordAmount("");
        setRecordReference("");
        loadPayments();
      })
      .finally(() => setRecordSubmitting(false));
  }

  function handleExport() {
    const t = getToken();
    if (!t) return;
    setExporting(true);
    const params = new URLSearchParams({ page: "1", limit: "5000" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (meterId) params.set("meterId", meterId);
    if (collectorId) params.set("collectorId", collectorId);
    if (method) params.set("method", method);
    fetch(`/api/tenant/payments?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const list = (d.payments ?? []) as Payment[];
        const headers = ["Date", "Payment #", "Meter", "Customer", "Amount", "Method", "Collector", "Reference", "Type"];
        const rows = list.map((p) => [
          new Date(p.recordedAt).toLocaleString(),
          p.paymentNumber ?? "",
          p.meter?.meterNumber ?? "",
          p.meter?.customerName ?? "",
          Number(p.amount).toFixed(2),
          (p.method ?? "").replace(/_/g, " "),
          p.collector?.fullName ?? "",
          p.reference ?? "",
          paymentType(p),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments-${from || "all"}-${to || "all"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .finally(() => setExporting(false));
  }

  function openReceipts(
    paymentId: string,
    paymentNumber: string | null,
    meterLabel: string,
    paymentAmount: number,
    paymentMethod: string,
    paymentRecordedAt: string
  ) {
    setReceiptsModal({
      paymentId,
      paymentNumber,
      meterLabel,
      paymentAmount,
      paymentMethod,
      paymentRecordedAt,
    });
    setReceipts([]);
    setAddAmountReceived(String(paymentAmount));
    setAddPaymentMethod(paymentMethod || "CASH");
    const t = getToken();
    if (!t) return;
    setLoadingReceipts(true);
    fetch(`/api/tenant/payments/${paymentId}/receipts`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((list) => setReceipts(Array.isArray(list) ? list : []))
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
      body: JSON.stringify({ amountReceived: amount, paymentMethod: addPaymentMethod }),
    })
      .then((r) => r.json())
      .then((receipt) => {
        if (receipt.id) setReceipts((prev) => [{ ...receipt, issuedAt: receipt.issuedAt ?? new Date().toISOString() }, ...prev]);
        setAddAmountReceived(String(receiptsModal.paymentAmount));
        setAddPaymentMethod(receiptsModal.paymentMethod || "CASH");
        loadPayments();
      })
      .finally(() => setAddingReceipt(false));
  }

  function printReceipt(receipt: Receipt, isPartial: boolean) {
    if (!receiptsModal) return;
    const amount = receipt.amountReceived ?? receiptsModal.paymentAmount;
    const methodKey = (receipt.paymentMethod ?? receiptsModal.paymentMethod) as string;
    const methodSomali: Record<string, string> = {
      CASH: "Lacag cad",
      MOBILE_MONEY: "Lacag mobil",
      BANK_TRANSFER: "Wareejinta bangiga",
      OTHER: "Kale",
    };
    const method = methodSomali[methodKey] || methodKey.replace(/_/g, " ");
    // Somali labels for paper receipt (warqad lacag)
    const labels = {
      company: tenantName || "Warqad Lacag",
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
    const paymentTypeLabel = isPartial ? labels.partial : labels.full;
    // Receipt shows only account name and number as plain text (no id, no relationship) so it stays correct if tenant changes accounts later
    const accountLines = moneyAccounts.map((a) => [a.name, a.accountNumber].filter(Boolean).join(" ").trim());
    const accountsSection =
      accountLines.length > 0
        ? `
        <div style="border-top: 1px solid #333; margin-top: 10px; padding-top: 8px; font-size: 11px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Lacag bixi (Xarumaha):</div>
          ${accountLines.map((line) => `<div>${line}</div>`).join("")}
        </div>
      `
        : "";
    const receiptBody = `
      <div style="width: 80mm; max-width: 300px; margin: 0 auto; padding: 16px; font-family: monospace; font-size: 12px; border: 1px dashed #999;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 14px;">${labels.company}</div>
        <div style="border-bottom: 1px solid #333; margin-bottom: 8px;"></div>
        <div>${labels.receiptNo}: ${receipt.receiptNumber || "—"}</div>
        <div>${labels.date}: ${new Date(receipt.issuedAt).toLocaleString()}</div>
        <div>${labels.paymentNo}: ${receiptsModal.paymentNumber ?? "—"}</div>
        <div>${labels.customer}: ${receiptsModal.meterLabel}</div>
        <div style="margin: 8px 0;">${labels.amount}: $${Number(amount).toFixed(2)}</div>
        <div>${labels.method}: ${method}</div>
        <div>${paymentTypeLabel}</div>
        ${accountsSection}
        <div style="border-top: 1px solid #333; margin-top: 12px; padding-top: 8px; text-align: center; font-size: 10px;">${labels.thanks}</div>
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

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const currentPage = data?.page ?? 1;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="View and record payments, print receipts, and export data. Summary reflects current filters."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRecordModalOpen(true)}>
              Record payment
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting || !data}>
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        }
      />

      {data && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total collected (filtered)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">${Number(data.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Payments (filtered)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{data.total.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="min-w-[140px]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="min-w-[140px]" />
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Meter</label>
          <select
            value={meterId}
            onChange={(e) => { setMeterId(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All meters</option>
            {meters.map((m) => (
              <option key={m.id} value={m.id}>{m.meterNumber} — {m.customerName}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Collector</label>
          <select
            value={collectorId}
            onChange={(e) => { setCollectorId(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Method</label>
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Per page</label>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setFrom(""); setTo(""); setMeterId(""); setCollectorId(""); setMethod(""); setPage(1); }}>
          Clear filters
        </Button>
      </div>

      {loading && !data ? (
        <PageLoading />
      ) : (
        <>
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Collector</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reference</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Receipts</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(data?.payments ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(p.recordedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-900">{p.paymentNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">{p.meter?.meterNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{p.meter?.customerName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">${Number(p.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(p.method ?? "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.collector?.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[120px] truncate" title={p.reference ?? ""}>{p.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        paymentType(p) === "Full" ? "bg-teal-100 text-teal-800" :
                        paymentType(p) === "Partial" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {paymentType(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{p._count?.receipts ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openReceipts(
                          p.id,
                          p.paymentNumber,
                          p.meter ? `${p.meter.meterNumber} — ${p.meter.customerName}` : "Payment",
                          Number(p.amount),
                          p.method,
                          p.recordedAt
                        )}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        Receipts
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
            <span>
              Showing {(currentPage - 1) * (data?.limit ?? 0) + 1}–{Math.min(currentPage * (data?.limit ?? 0), data?.total ?? 0)} of {data?.total ?? 0} payments
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {receiptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setReceiptsModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Receipts — {receiptsModal.meterLabel}</h2>
              <p className="text-sm text-slate-500">
                Payment: <strong>${receiptsModal.paymentAmount.toFixed(2)}</strong> · {receiptsModal.paymentMethod.replace(/_/g, " ")}. Add a receipt to print for the customer (full or partial).
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <form onSubmit={handleAddReceipt} className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-xs font-medium text-slate-600">Add receipt (for printing)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Amount received</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addAmountReceived}
                      onChange={(e) => setAddAmountReceived(e.target.value)}
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
                </div>
                <Button type="submit" size="sm" disabled={addingReceipt} className="mt-3">
                  {addingReceipt ? "Adding…" : "Add receipt"}
                </Button>
              </form>
              {loadingReceipts ? (
                <p className="text-slate-500">Loading receipts…</p>
              ) : receipts.length === 0 ? (
                <p className="text-slate-500">No receipts yet. Add one above to print.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Receipt #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Method</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {receipts.map((r) => {
                        const amt = r.amountReceived ?? receiptsModal.paymentAmount;
                        const isPartial = amt < receiptsModal.paymentAmount;
                        return (
                          <tr key={r.id}>
                            <td className="px-3 py-2 font-mono text-slate-900">{r.receiptNumber || "—"}</td>
                            <td className="px-3 py-2 text-slate-700">${Number(amt).toFixed(2)}</td>
                            <td className="px-3 py-2 text-slate-600">{(r.paymentMethod ?? "").replace(/_/g, " ")}</td>
                            <td className="px-3 py-2 text-slate-600">{new Date(r.issuedAt).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <Button type="button" size="sm" variant="secondary" onClick={() => printReceipt(r, isPartial)}>
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
            <div className="border-t border-slate-200 px-4 py-3">
              <Button type="button" variant="secondary" onClick={() => setReceiptsModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !recordSubmitting && setRecordModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>
              <p className="text-sm text-slate-500">Record a customer payment against a meter. Invoice (if any) will be updated.</p>
            </div>
            <form onSubmit={handleRecordPayment} className="p-4 space-y-4">
              {recordError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{recordError}</p>}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Meter</label>
                <select
                  value={recordMeterId}
                  onChange={(e) => setRecordMeterId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select meter</option>
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>{m.meterNumber} — {m.customerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Amount ($)</label>
                <Input type="number" step="0.01" min="0.01" value={recordAmount} onChange={(e) => setRecordAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Method</label>
                <select value={recordMethod} onChange={(e) => setRecordMethod(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Reference (optional)</label>
                <Input value={recordReference} onChange={(e) => setRecordReference(e.target.value)} placeholder="Transaction ID, note…" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => !recordSubmitting && setRecordModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={recordSubmitting || !recordMeterId || !recordAmount || Number(recordAmount) <= 0}>
                  {recordSubmitting ? "Recording…" : "Record payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
