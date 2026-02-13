"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { TableWrapper } from "@/components/ui/table-responsive";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";

export default function InvoicesPage() {
  const [data, setData] = useState<{ invoices: unknown[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    fetch("/api/tenant/invoices?limit=50", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
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

  const invoices = (data?.invoices ?? []) as Array<{ id: string; amount: number; status: string; meter?: { meterNumber: string; customerName: string } }>;
  return (
    <div>
      <PageHeader title="Invoices" description="View and manage invoices." />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices will appear here when created." />
      ) : (
        <TableWrapper>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter / Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{inv.meter ? `${inv.meter.meterNumber} — ${inv.meter.customerName}` : "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">${Number(inv.amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "default"}>{inv.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">Total: {data?.total ?? 0}</div>
        </TableWrapper>
      )}
    </div>
  );
}
