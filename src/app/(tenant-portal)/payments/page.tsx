"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PaymentCardsSkeleton, PaymentsListSkeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { TableWrapper } from "@/components/ui/table-responsive";

type Payment = {
  id: string;
  paymentNumber: string | null;
  amount: number | string;
  method: string;
  status?: string; // PENDING | PAID | PARTIALLY_PAID | TRANSFERRED | REFUNDED
  reference: string | null;
  recordedAt: string;
  paidAmount?: number;
  balance?: number;
  receiptAccounts?: string[]; // money account(s) that received the payment (from receipts)
  meter?: {
    id: string;
    meterNumber: string;
    customerName: string;
    customerPhone?: string | null;
    residentPhone?: string | null;
    meterReadings?: Array<{ value: number | string; unit?: string | null }>;
  } | null;
  collector?: { id: string; fullName: string } | null;
  invoice?: { id: string; amount: number | string; balance: number | string; status: string } | null;
  _count?: { receipts: number };
};

type Receipt = {
  id: string;
  receiptNumber: string | null;
  amount: number;
  paymentAccount: string | null;
  receivedBy: string | null;
  paidAt: string;
  createdAt?: string;
};

const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"] as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;

type Summary = Record<string, { count: number; totalAmount: number }>;

const STATUS_FILTERS: { key: "" | "PENDING" | "PAID" | "PARTIALLY_PAID" | "TRANSFERRED" | "REFUNDED"; label: string; bg: string; icon: "all" | "pending" | "full" | "partial" | "transferred" | "refunded" }[] = [
  { key: "", label: "All payments", bg: "bg-violet-50", icon: "all" },
  { key: "PAID", label: "Full", bg: "bg-emerald-50", icon: "full" },
  { key: "PENDING", label: "Pending", bg: "bg-amber-50", icon: "pending" },
  { key: "PARTIALLY_PAID", label: "Partial", bg: "bg-amber-50", icon: "partial" },
  { key: "TRANSFERRED", label: "Transferred", bg: "bg-sky-50", icon: "transferred" },
  { key: "REFUNDED", label: "Refunded", bg: "bg-rose-50", icon: "refunded" },
];

function paymentStatusLabel(p: Payment): string {
  const status = p.status as string | undefined;
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

export default function PaymentsPage() {
  const [data, setData] = useState<{ payments: Payment[]; total: number; page: number; limit: number; totalAmount?: number; summary?: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [meterSearch, setMeterSearch] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "PAID" | "PARTIALLY_PAID" | "TRANSFERRED" | "REFUNDED">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [meters, setMeters] = useState<Array<{ id: string; meterNumber: string; customerName: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; fullName: string }>>([]);
  const [tenantName, setTenantName] = useState("");
  // Snapshot of account name + number only (no id); used as plain text on receipt so it stays correct if accounts are changed later
  const [moneyAccounts, setMoneyAccounts] = useState<Array<{ id: string; name: string; accountNumber: string | null }>>([]);

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
  const [addAccount, setAddAccount] = useState("");
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);

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
    if (meterSearch) params.set("meterSearch", meterSearch);
    if (collectorId) params.set("collectorId", collectorId);
    if (statusFilter) params.set("status", statusFilter);
    setLoading(true);
    fetch(`/api/tenant/payments?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({
          payments: d.payments ?? [],
          total: d.total ?? 0,
          page: d.page ?? page,
          limit: d.limit ?? limit,
          totalAmount: d.totalAmount ?? 0,
          summary: d.summary ?? {},
        });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [page, limit, from, to, meterSearch, collectorId, statusFilter]);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    if (!from && !to) {
      setFrom(startOfMonth);
      setTo(endOfMonth);
      return;
    }
    loadPayments();
  }, [loadPayments, from, to]);

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
        setMoneyAccounts(list.map((a: { id: string; name: string; accountNumber?: string | null }) => ({ id: a.id, name: a.name, accountNumber: a.accountNumber ?? null })));
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
    if (meterSearch) params.set("meterSearch", meterSearch);
    if (collectorId) params.set("collectorId", collectorId);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/tenant/payments?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const list = (d.payments ?? []) as Payment[];
        const headers = ["Date", "Payment #", "Meter", "Customer", "Phone", "Reading", "Amount", "Paid", "Balance", "Collector", "Reference", "Account", "Type"];
        const rows = list.map((p) => {
          const phone = [p.meter?.customerPhone, p.meter?.residentPhone].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" / ") || "";
          const reading = p.meter?.meterReadings?.[0];
          const readingStr = reading != null ? `${Number(reading.value)} ${reading.unit ?? "m³"}` : "";
          return [
            new Date(p.recordedAt).toLocaleString(),
            p.paymentNumber ?? "",
            p.meter?.meterNumber ?? "",
            p.meter?.customerName ?? "",
            phone,
            readingStr,
            Number(p.amount).toFixed(2),
            Number(p.paidAmount ?? 0).toFixed(2),
            Number(p.balance ?? p.amount).toFixed(2),
            p.collector?.fullName ?? "",
            p.reference ?? "",
            (p.receiptAccounts?.length ? p.receiptAccounts.join(", ") : "") || p.method?.replace(/_/g, " ") || "",
            paymentStatusLabel(p),
          ];
        });
        const data = [headers, ...rows];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Payments");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments-${from || "all"}-${to || "all"}.xlsx`;
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
    setAddAccount(moneyAccounts[0]?.name ?? "");
    setAddReceiptModalOpen(false);
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
    const paidSoFar = receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const remainingBalance = Math.round((receiptsModal.paymentAmount - paidSoFar) * 100) / 100;
    const amount = addAmountReceived.trim() ? parseFloat(addAmountReceived) : remainingBalance;
    if (Number.isNaN(amount) || amount < 0) return;
    setAddingReceipt(true);
    fetch(`/api/tenant/payments/${receiptsModal.paymentId}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ amount, amountReceived: amount, account: addAccount || undefined }),
    })
      .then((r) => r.json())
      .then((receipt) => {
        if (receipt.id) setReceipts((prev) => [{ ...receipt, paymentAccount: receipt.paymentAccount ?? null, receivedBy: receipt.receivedBy ?? null, paidAt: receipt.paidAt ?? new Date().toISOString() }, ...prev]);
        const newPaid = receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0) + Number(receipt.amount ?? amount);
        const newBalance = Math.round((receiptsModal.paymentAmount - newPaid) * 100) / 100;
        setAddAmountReceived(String(newBalance));
        setAddAccount(moneyAccounts[0]?.name ?? "");
        setAddReceiptModalOpen(false);
        loadPayments();
      })
      .finally(() => setAddingReceipt(false));
  }

  function openAddReceiptModal() {
    const paid = receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const remainingBalance = receiptsModal ? Math.round((receiptsModal.paymentAmount - paid) * 100) / 100 : 0;
    setAddAmountReceived(String(remainingBalance));
    setAddAccount(moneyAccounts[0]?.name ?? "");
    setAddReceiptModalOpen(true);
  }

  function printReceipt(receipt: Receipt, isPartial: boolean) {
    if (!receiptsModal) return;
    const amount = receipt.amount ?? receiptsModal.paymentAmount;
    const methodSomali: Record<string, string> = {
      CASH: "Lacag cad",
      MOBILE_MONEY: "Lacag mobil",
      BANK_TRANSFER: "Wareejinta bangiga",
      OTHER: "Kale",
    };
    const method = receipt.paymentAccount ?? "—";
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
        <div>${labels.date}: ${new Date(receipt.paidAt).toLocaleString()}</div>
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
        description="View and record payments, print receipts, and export data."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting || !data}>
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setRecordModalOpen(true)}>
              New payment
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <PaymentCardsSkeleton />
      ) : data?.summary ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_FILTERS.map((f) => {
            const sum = f.key === "" ? data.summary!.all : data.summary![f.key];
            const count = sum?.count ?? 0;
            const totalAmount = sum?.totalAmount ?? 0;
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key || "all"}
                type="button"
                onClick={() => { setStatusFilter(f.key); setPage(1); }}
                className={`rounded-xl border p-4 text-left shadow-sm transition hover:opacity-90 ${f.bg} ${active ? "ring-2 ring-violet-400 border-violet-200" : "border-slate-200/80"}`}
              >
                <span className="flex items-center gap-2">
                  {f.icon === "all" && <span className="text-violet-600" aria-hidden>◇</span>}
                  {f.icon === "full" && <span className="text-emerald-600" aria-hidden>✓</span>}
                  {f.icon === "pending" && <span className="text-amber-600" aria-hidden>○</span>}
                  {f.icon === "partial" && <span className="text-amber-600" aria-hidden>◐</span>}
                  {f.icon === "transferred" && <span className="text-sky-600" aria-hidden>→</span>}
                  {f.icon === "refunded" && <span className="text-rose-600" aria-hidden>✕</span>}
                  <span className="text-sm font-medium text-slate-700">{f.label}</span>
                </span>
                <p className="mt-1 text-lg font-semibold text-slate-900">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-500">{count} records</p>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2">
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="min-w-0 flex-1 basis-28 sm:max-w-[140px]" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="min-w-0 flex-1 basis-28 sm:max-w-[140px]" />
        <Input type="text" value={meterSearch} onChange={(e) => { setMeterSearch(e.target.value); setPage(1); }} placeholder="Meter or customer" className="min-w-0 flex-1 basis-52 sm:min-w-[220px] sm:max-w-[320px]" />
        <select value={collectorId} onChange={(e) => { setCollectorId(e.target.value); setPage(1); }} className="min-w-0 flex-1 basis-36 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 sm:max-w-[140px]">
          <option value="">All collectors</option>
          {collectors.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setFrom(""); setTo(""); setMeterSearch(""); setCollectorId(""); setStatusFilter(""); setPage(1); }}>Clear</Button>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="w-[100px] shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && data && (
        <p className="mb-2 text-sm text-slate-600">
          {selectedIds.size} selected payments | ${Array.from(selectedIds).reduce((sum, id) => {
            const p = data.payments.find((x) => x.id === id);
            return sum + (p ? Number(p.amount) : 0);
          }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total amount
        </p>
      )}

      {loading && !data ? (
        <PaymentsListSkeleton />
      ) : (
        <>
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={data?.payments.length ? data.payments.every((p) => selectedIds.has(p.id)) : false}
                      onChange={(e) => {
                        if (!data) return;
                        if (e.target.checked) setSelectedIds(new Set(data.payments.map((p) => p.id)));
                        else setSelectedIds(new Set());
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Code</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phone</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Reading</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Paid</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Balance</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(data?.payments ?? []).map((p) => {
                  const label = paymentStatusLabel(p);
                  const amt = Number(p.amount);
                  const paid = Number(p.paidAmount ?? 0);
                  const bal = Number(p.balance ?? amt);
                  const accountLabel = (p.receiptAccounts?.length ? p.receiptAccounts.join(", ") : null) ?? p.method?.replace(/_/g, " ") ?? "—";
                  const receiptCount = p._count?.receipts ?? 0;
                  const richDescription = (() => {
                    const parts: string[] = [];
                    if (p.reference?.trim()) parts.push(`Ref: ${p.reference.trim()}`);
                    if (p.meter?.meterNumber) parts.push(`Meter ${p.meter.meterNumber}`);
                    parts.push(accountLabel);
                    parts.push(`Paid $${paid.toFixed(2)} / $${amt.toFixed(2)}`);
                    if (bal !== 0) parts.push(`Bal. $${bal.toFixed(2)}`);
                    if (receiptCount > 0) parts.push(`${receiptCount} receipt${receiptCount !== 1 ? "s" : ""}`);
                    return parts.join(" · ") || "—";
                  })();
                  const phoneDisplay = [p.meter?.customerPhone, p.meter?.residentPhone]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(" / ") || "—";
                  const currentReading = p.meter?.meterReadings?.[0];
                  const readingDisplay = currentReading != null
                    ? `${Number(currentReading.value)} ${currentReading.unit ?? "m³"}`
                    : "—";
                  const dateTimeDisplay = new Date(p.recordedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((s) => new Set([...s, p.id]));
                            else setSelectedIds((s) => { const n = new Set(s); n.delete(p.id); return n; });
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/payments/${p.id}`} className="font-mono text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                          #{p.paymentNumber ?? p.id.slice(0, 6)}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          label === "Full" ? "bg-emerald-100 text-emerald-800" :
                          label === "Partial" ? "bg-amber-100 text-amber-800" :
                          label === "Transferred" ? "bg-sky-100 text-sky-800" :
                          label === "Refunded" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
                        }`}>
                          {label}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-sm text-slate-600" title={richDescription}>
                        {richDescription}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{dateTimeDisplay}</td>
                      <td className="px-3 py-3 text-sm text-slate-900">{p.meter?.customerName ?? "—"}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{phoneDisplay}</td>
                      <td className="px-3 py-3 font-mono text-sm text-slate-600">{p.meter?.meterNumber ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-slate-700">{readingDisplay}</td>
                      <td className="px-3 py-3 text-right text-sm text-slate-700">${paid.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-900">${amt.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-slate-800">${bal.toFixed(2)}</td>
                      <td className="max-w-[140px] truncate px-3 py-3 text-xs text-slate-600" title={accountLabel}>{accountLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrapper>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
            <span>
              Show {(currentPage - 1) * (data?.limit ?? 0) + 1} to {Math.min(currentPage * (data?.limit ?? 0), data?.total ?? 0)} of {data?.total ?? 0} results
            </span>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ‹
              </Button>
              {(() => {
                const pages: (number | "ellipsis")[] = [];
                if (totalPages <= 5) for (let i = 1; i <= totalPages; i++) pages.push(i);
                else {
                  pages.push(1);
                  const low = Math.max(2, currentPage - 1);
                  const high = Math.min(totalPages - 1, currentPage + 1);
                  if (low > 2) pages.push("ellipsis");
                  for (let i = low; i <= high; i++) pages.push(i);
                  if (high < totalPages - 1) pages.push("ellipsis");
                  if (totalPages > 1) pages.push(totalPages);
                }
                return pages.map((n, i) =>
                  n === "ellipsis" ? <span key={`e-${i}`} className="px-2 text-slate-400">…</span> : (
                    <Button key={n} variant={currentPage === n ? "primary" : "secondary"} size="sm" onClick={() => setPage(n)}>{n}</Button>
                  )
                );
              })()}
              <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                ›
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
                Payment: <strong>${receiptsModal.paymentAmount.toFixed(2)}</strong>. Add a receipt (amount and account) to print for the customer (full or partial).
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {(() => {
                const paid = receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
                const remainingBalance = Math.round((receiptsModal.paymentAmount - paid) * 100) / 100;
                return remainingBalance > 0 ? (
                  <div className="mb-4">
                    <Button type="button" size="sm" onClick={openAddReceiptModal}>
                      Add receipt
                    </Button>
                  </div>
                ) : null;
              })()}
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Account</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Received by</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {receipts.map((r) => {
                        const amt = r.amount ?? receiptsModal.paymentAmount;
                        const isPartial = amt < receiptsModal.paymentAmount;
                        return (
                          <tr key={r.id}>
                            <td className="px-3 py-2 font-mono text-slate-900">{r.receiptNumber || "—"}</td>
                            <td className="px-3 py-2 text-slate-700">${Number(amt).toFixed(2)}</td>
                            <td className="px-3 py-2 text-slate-600">{r.paymentAccount ?? "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{r.receivedBy ?? "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{new Date(r.paidAt).toLocaleString()}</td>
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

      {receiptsModal && addReceiptModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !addingReceipt && setAddReceiptModalOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Receipt received amount</h3>
            <p className="mt-1 text-sm text-slate-500">Payment: ${receiptsModal.paymentAmount.toFixed(2)}. Enter amount received for this receipt (full or partial).</p>
            <form onSubmit={handleAddReceipt} className="mt-4 space-y-4">
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
