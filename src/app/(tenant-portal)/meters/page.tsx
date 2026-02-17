"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  price: { id: string; name: string; pricePerCubic: number | string } | null;
};

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "OVERDUE", "INACTIVE"] as const;
const PAGE_SIZES = [10, 20, 50, 100] as const;

export default function TenantMetersPage() {
  const [data, setData] = useState<{ meters: Meter[]; total: number; page: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; fullName: string }>>([]);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const t = getToken();
    if (!t) return;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (searchDebounced) params.set("search", searchDebounced);
    if (zoneId) params.set("zoneId", zoneId);
    if (status) params.set("status", status);
    if (collectorId) params.set("collectorId", collectorId);
    fetch(`/api/tenant/meters?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({
          meters: d.meters ?? [],
          total: d.total ?? 0,
          page: d.page ?? page,
          limit: d.limit ?? limit,
        });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [page, limit, searchDebounced, zoneId, status, collectorId]);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/zones", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((z) => { if (!z?.error) setZones(Array.isArray(z) ? z : []); })
      .catch(() => {});
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((u) => setCollectors(u?.users ?? []))
      .catch(() => {});
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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const currentPage = data?.page ?? 1;

  return (
    <div>
      <PageHeader
        title="Meters"
        description="Meter machines and account info."
        action={
          <Link href="/meters/new">
            <Button>+ Add meter</Button>
          </Link>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <Input
          type="search"
          placeholder="Search meter #, customer, phone, address, plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={zoneId}
          onChange={(e) => { setZoneId(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={collectorId}
          onChange={(e) => { setCollectorId(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All collectors</option>
          {collectors.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </select>
      </div>

      {data?.meters.length === 0 ? (
        <EmptyState
          title="No meters yet"
          description="Add your first meter or adjust filters."
          action={<Link href="/meters/new"><Button>Add meter</Button></Link>}
        />
      ) : (
        <>
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phones</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Plate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Collector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.meters.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/meters/${m.id}`} className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline">
                        {m.meterNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{m.customerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{[m.customerPhone, m.residentPhone].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(m.section || m.subSection) ? [m.section, m.subSection].filter(Boolean).join(" / ") : "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.zone?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {m.price ? (
                        <span title={`${m.price.name}: ${Number(m.price.pricePerCubic).toFixed(4)} per m³`}>
                          {m.price.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.plateNumber ?? "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate" title={m.address ?? ""}>{m.address ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.collector?.fullName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
            <span>
              Showing {(currentPage - 1) * (data?.limit ?? 0) + 1}–{Math.min(currentPage * (data?.limit ?? 0), data?.total ?? 0)} of {data?.total ?? 0} meters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
