"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type Reading = {
  id: string;
  value: number;
  unit?: string;
  meter?: { meterNumber: string; customerName: string };
  recordedAt: string;
};

export default function TenantMetersPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "readings" ? "readings" : "meters";
  const [data, setData] = useState<{ meters: Meter[]; total: number } | null>(null);
  const [readingsData, setReadingsData] = useState<{ readings: Reading[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const load = useCallback(() => {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/meters?limit=100", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ meters: d.meters ?? [], total: d.total ?? 0 });
      })
      .catch(() => setError("Failed to load"));
    fetch("/api/tenant/meter-readings?limit=100", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setReadingsData({ readings: d.readings ?? [], total: d.total ?? 0 });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
    setLoading(false);
  }, [load]);

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
        description={view === "readings" ? "Recorded consumption readings per meter." : "Meter machines and account info. One row per meter."}
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <Link
            href="/meters"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${view === "meters" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Meters
          </Link>
          <Link
            href="/meters?view=readings"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${view === "readings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Readings
          </Link>
        </div>
        {view === "meters" && (
          <Link href="/meters/new">
            <Button>+ Add meter</Button>
          </Link>
        )}
      </div>

      {view === "readings" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Meter / Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(readingsData?.readings ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-slate-900">{r.meter ? `${r.meter.meterNumber} — ${r.meter.customerName}` : "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{Number(r.value)} {r.unit ?? "m³"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.recordedAt ? new Date(r.recordedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">Total: {readingsData?.total ?? 0} readings</div>
        </div>
      ) : data?.meters.length === 0 ? (
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
