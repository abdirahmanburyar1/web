"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";
import { EmptyState } from "@/components/ui/empty";

type Meter = {
  id: string;
  meterNumber: string;
  customerName: string;
  customerPhone: string | null;
  residentPhone: string | null;
  section: string | null;
  subSection: string | null;
  plateNumber: string | null;
  status: string;
  address: string | null;
  meterType: string | null;
  meterModel: string | null;
  installationDate: string | null;
  serialNumber: string | null;
  zone: { id: string; name: string } | null;
  collector: { id: string; fullName: string } | null;
};

export default function TenantMetersPage() {
  const [data, setData] = useState<{ meters: Meter[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/meters?limit=100", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ meters: d.meters ?? [], total: d.total ?? 0 });
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
    setLoading(false);
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

  const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default");

  return (
    <div>
      <PageHeader
        title="Meters"
        description="Meter machines and account info. One row per meter."
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="mb-6">
        <Link href="/meters/new">
          <Button>+ Add meter</Button>
        </Link>
      </div>

      {data?.meters.length === 0 ? (
        <EmptyState
          title="No meters yet"
          description="Add your first meter to get started."
          action={<Link href="/meters/new"><Button>Add meter</Button></Link>}
        />
      ) : (
        <TableWrapper>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phones</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Plate</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Collector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data?.meters.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">{m.meterNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{m.customerName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{[m.customerPhone, m.residentPhone].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{(m.section || m.subSection) ? [m.section, m.subSection].filter(Boolean).join(" / ") : "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.zone?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.plateNumber ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate" title={m.address ?? ""}>{m.address ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.collector?.fullName ?? "—"}</td>
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
