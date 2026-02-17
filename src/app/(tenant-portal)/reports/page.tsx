"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableWrapper } from "@/components/ui/table-responsive";

type Summary = {
  paymentsCount: number;
  paymentsSum: number;
  readingsCount: number;
  overdueInvoices: number;
  metersCount: number;
};

type PaymentRow = {
  id: string;
  paymentNumber: string | null;
  amount: number | string;
  method: string | null;
  recordedAt: string;
  meter: { meterNumber: string; customerName: string } | null;
  collector: { fullName: string } | null;
};

export default function TenantReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const load = useCallback(() => {
    const t = getToken();
    if (!t) return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    setLoading(true);
    fetch(`/api/tenant/reports?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setSummary(data.summary ?? null);
          setRecentPayments(data.recentPayments ?? []);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  async function exportCsv() {
    const t = getToken();
    if (!t) return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/tenant/reports/export?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !summary) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, collections, and readings. Filter by date range and export to CSV."
        action={
          <Button variant="secondary" onClick={exportCsv}>
            Export payments CSV
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-[140px]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-[140px]" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setFrom(""); setTo(""); }}>
          Clear dates
        </Button>
      </div>

      {loading ? (
        <PageLoading />
      ) : summary ? (
        <>
          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Summary</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">Payments</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{summary.paymentsCount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">Collected</p>
                  <p className="mt-2 text-2xl font-bold text-teal-600">${Number(summary.paymentsSum).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">Readings</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{summary.readingsCount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">Active meters</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{summary.metersCount}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">Overdue invoices</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{summary.overdueInvoices}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Recent payments</h2>
            {recentPayments.length === 0 ? (
              <Card className="border-slate-200/80">
                <CardContent className="py-12 text-center text-slate-500">
                  No payments in this period. Adjust the date range or record payments from the collector flow.
                </CardContent>
              </Card>
            ) : (
              <TableWrapper>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payment #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter / Customer</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Collector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {new Date(p.recordedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-900">{p.paymentNumber ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {p.meter ? `${p.meter.meterNumber} — ${p.meter.customerName}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">${Number(p.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{p.collector?.fullName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
