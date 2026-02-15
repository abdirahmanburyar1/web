"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";
import { EmptyState } from "@/components/ui/empty";

type Meter = {
  id: string;
  meterNumber: string;
  customerName: string;
  status: string;
  address: string | null;
  zone: { id: string; name: string } | null;
};

export default function CollectorMetersPage() {
  const [data, setData] = useState<{ meters: Meter[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    fetch("/api/tenant/collector/my-meters", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ meters: d.meters ?? [], total: d.total ?? 0 });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default");

  return (
    <div>
      <PageHeader
        title="My meters"
        description="Meters assigned to you. Record payments and readings from here or the quick actions."
      />
      {data?.meters.length === 0 ? (
        <EmptyState
          title="No meters assigned"
          description="Your admin will assign meters to you. Contact them to get started."
        />
      ) : (
        <TableWrapper>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data?.meters.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">{m.meterNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{m.customerName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.zone?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={m.address ?? ""}>{m.address ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/collector/record-payment?meterId=${m.id}`} className="text-sm font-medium text-teal-600 hover:underline mr-3">Payment</Link>
                    <Link href={`/collector/record-reading?meterId=${m.id}`} className="text-sm font-medium text-teal-600 hover:underline">Reading</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">Total: {data?.total ?? 0} meters</div>
        </TableWrapper>
      )}
    </div>
  );
}
