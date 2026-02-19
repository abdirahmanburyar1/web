"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

type Reading = {
  id: string;
  value: number | string;
  unit: string | null;
  pricePerCubic: number | string | null;
  recordedAt: string;
  meterId: string;
  meter: { id: string; meterNumber: string; customerName: string };
  recordedBy: { id: string; fullName: string } | null;
};

const PAGE_SIZES = [25, 50, 100] as const;

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function ReadingHistoryPage() {
  const defaultRange = getDefaultDateRange();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [recordedById, setRecordedById] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; fullName: string }>>([]);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const load = useCallback(() => {
    const t = getToken();
    if (!t) return;
    const toEndOfDay = new Date(dateTo);
    toEndOfDay.setHours(23, 59, 59, 999);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("from", dateFrom);
    params.set("to", toEndOfDay.toISOString());
    if (search.trim()) params.set("search", search.trim());
    if (zoneId) params.set("zoneId", zoneId);
    if (recordedById) params.set("recordedById", recordedById);
    setLoading(true);
    setError("");
    fetch(`/api/tenant/meter-readings?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else {
          setReadings(data.readings ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => setError("Failed to load readings"))
      .finally(() => setLoading(false));
  }, [page, limit, dateFrom, dateTo, search, zoneId, recordedById]);

  useEffect(() => {
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

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  return (
    <div>
      <PageHeader
        title="Reading history"
        description="All meter readings across your meters. Filter by meter, zone, collector, or date range."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Filters</span>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Meter / customer</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Meter # or customer name"
              className="w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Zone</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Recorded by</label>
            <select
              value={recordedById}
              onChange={(e) => setRecordedById(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Per page</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={() => { setPage(1); load(); }}>Apply</Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const def = getDefaultDateRange();
            setDateFrom(def.from);
            setDateTo(def.to);
            setSearch("");
            setZoneId("");
            setRecordedById("");
            setPage(1);
          }}>Clear</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Readings</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{total} total</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading && readings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600 dark:border-slate-600 dark:border-t-teal-500" />
            </div>
          ) : readings.length === 0 ? (
            <p className="py-12 text-center text-slate-500 dark:text-slate-400">No readings match the filters. Adjust dates or search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date & time</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Meter</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Value (m³)</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Price/m³</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {readings.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                          {new Date(r.recordedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/meters/${r.meter.id}/readings`}
                            className="font-medium text-teal-600 hover:underline dark:text-teal-400"
                          >
                            {r.meter.meterNumber}
                          </Link>
                          <span className="ml-2 text-slate-500 dark:text-slate-400">{r.meter.customerName}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {Number(r.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {r.pricePerCubic != null ? `$${Number(r.pricePerCubic).toFixed(4)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {r.recordedBy?.fullName ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/30">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {fromItem}–{toItem} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
