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

type Summary = Record<string, number>;

const METER_FILTERS: { key: "" | (typeof STATUSES)[number]; label: string; bg: string }[] = [
  { key: "", label: "All meters", bg: "bg-violet-50 dark:bg-violet-900/20" },
  { key: "ACTIVE", label: "Active", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "PENDING", label: "Pending", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "SUSPENDED", label: "Suspended", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "OVERDUE", label: "Overdue", bg: "bg-rose-50 dark:bg-rose-900/20" },
  { key: "INACTIVE", label: "Inactive", bg: "bg-slate-100 dark:bg-slate-800/50" },
];

export default function TenantMetersPage() {
  const [data, setData] = useState<{
    meters: Meter[];
    total: number;
    page: number;
    limit: number;
    summary?: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | (typeof STATUSES)[number]>("");
  const [collectorId, setCollectorId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; fullName: string }>>([]);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

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
    if (statusFilter) params.set("status", statusFilter);
    if (collectorId) params.set("collectorId", collectorId);
    setLoading(true);
    fetch(`/api/tenant/meters?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else
          setData({
            meters: d.meters ?? [],
            total: d.total ?? 0,
            page: d.page ?? page,
            limit: d.limit ?? limit,
            summary: d.summary ?? null,
          });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [page, limit, searchDebounced, zoneId, statusFilter, collectorId]);

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/zones", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((z) => {
        if (!z?.error) setZones(Array.isArray(z) ? z : []);
      })
      .catch(() => {});
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((u) => setCollectors(u?.users ?? []))
      .catch(() => {});
  }, []);

  if (loading && !data) return <PageLoading />;
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  const statusVariant = (s: string) =>
    s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const currentPage = data?.page ?? 1;
  const summary = data?.summary ?? {};

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
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* Filter cards */}
      <div className="mb-4 flex flex-wrap gap-2">
        {METER_FILTERS.map((f) => {
          const count = f.key === "" ? summary.all : summary[f.key];
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key || "all"}
              type="button"
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-900/30 dark:text-teal-200"
                  : `border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-500 ${f.bg}`
              }`}
            >
              <span className="block">{f.label}</span>
              <span className={active ? "text-teal-600 dark:text-teal-300" : "text-slate-500 dark:text-slate-400"}>
                {count != null ? count : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Single filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        <Input
          type="search"
          placeholder="Search meter #, customer, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] max-w-[240px]"
        />
        <select
          value={zoneId}
          onChange={(e) => {
            setZoneId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select
          value={collectorId}
          onChange={(e) => {
            setCollectorId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All collectors</option>
          {collectors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setZoneId("");
            setCollectorId("");
            setStatusFilter("");
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Clear
        </button>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
      </div>

      {data?.meters.length === 0 ? (
        <EmptyState
          title="No meters found"
          description="Add your first meter or adjust filters."
          action={
            <Link href="/meters/new">
              <Button>Add meter</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Meter #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Phones
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Section
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Collector
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900/20">
                {data?.meters.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/meters/${m.id}`}
                        className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        {m.meterNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      {m.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {[m.customerPhone, m.residentPhone].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {(m.section || m.subSection) ? [m.section, m.subSection].filter(Boolean).join(" / ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {m.zone?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {m.price ? (
                        <span title={`${m.price.name}: ${Number(m.price.pricePerCubic).toFixed(4)} per m³`}>
                          {m.price.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {m.collector?.fullName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400">
            <span>
              Showing {(currentPage - 1) * (data?.limit ?? 0) + 1}–
              {Math.min(currentPage * (data?.limit ?? 0), data?.total ?? 0)} of {data?.total ?? 0} meters
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
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
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
        </div>
      )}
    </div>
  );
}
