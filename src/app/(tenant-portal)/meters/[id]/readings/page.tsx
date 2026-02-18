"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, BarChart3, Calendar, Droplets, Filter } from "lucide-react";

const PAGE_SIZES = [10, 25, 50, 100] as const;

type Reading = {
  id: string;
  value: number | string;
  unit: string | null;
  pricePerCubic: number | string | null;
  recordedAt: string;
  meter: { id: string; meterNumber: string; customerName: string };
  recordedBy: { id: string; fullName: string } | null;
};

type ChartPoint = { month: string; value: number; label: string };

function getDefaultMonthRange() {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

export default function MeterReadingsPage() {
  const params = useParams();
  const id = params.id as string;
  const defaultRange = getDefaultMonthRange();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [monthFrom, setMonthFrom] = useState(defaultRange.from);
  const [monthTo, setMonthTo] = useState(defaultRange.to);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const [meterLabel, setMeterLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const dateRangeFromParams = useCallback(() => {
    const [yFrom, mFrom] = monthFrom.split("-").map(Number);
    const [yTo, mTo] = monthTo.split("-").map(Number);
    const fromDate = new Date(yFrom, mFrom - 1, 1);
    const toDate = new Date(yTo, mTo, 0, 23, 59, 59, 999);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }, [monthFrom, monthTo]);

  const loadChartReadings = useCallback(() => {
    const t = getToken();
    if (!t || !id || !monthFrom || !monthTo) return;
    const { from, to } = dateRangeFromParams();
    setChartLoading(true);
    fetch(
      `/api/tenant/meter-readings?meterId=${encodeURIComponent(id)}&from=${from}&to=${to}&limit=500`,
      { headers: { Authorization: `Bearer ${t}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const list: { value: number | string; recordedAt: string }[] = data.readings ?? [];
        const byMonth: Record<string, number> = {};
        list.forEach((r) => {
          const d = new Date(r.recordedAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          byMonth[key] = Number(r.value);
        });
        // Build all months in range (from monthFrom to monthTo) so chart shows every month even with no data
        const [yFrom, mFrom] = monthFrom.split("-").map(Number);
        const [yTo, mTo] = monthTo.split("-").map(Number);
        const months: string[] = [];
        let y = yFrom;
        let m = mFrom;
        const endY = yTo;
        const endM = mTo;
        while (y < endY || (y === endY && m <= endM)) {
          months.push(`${y}-${String(m).padStart(2, "0")}`);
          m += 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
        }
        const sorted = months.map((month) => ({
          month,
          value: byMonth[month] ?? 0,
          label: new Date(month + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        }));
        setChartData(sorted);
      })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [id, monthFrom, monthTo, dateRangeFromParams]);

  const loadReadings = useCallback((pageOverride?: number) => {
    const t = getToken();
    if (!t || !id) return;
    setLoading(true);
    setError("");
    const { from, to } = dateRangeFromParams();
    const p = pageOverride ?? page;
    fetch(
      `/api/tenant/meter-readings?meterId=${encodeURIComponent(id)}&from=${from}&to=${to}&page=${p}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${t}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error);
          return;
        }
        setReadings(data.readings ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setError("Failed to load readings"))
      .finally(() => setLoading(false));
  }, [id, page, limit, dateRangeFromParams]);

  useEffect(() => {
    loadChartReadings();
  }, [loadChartReadings]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    const t = getToken();
    if (!t || !id) return;
    fetch(`/api/tenant/meters/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((m) => {
        if (m?.meterNumber) setMeterLabel(`${m.meterNumber} — ${m.customerName ?? "Meter"}`);
      })
      .catch(() => {});
  }, [id]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const fromItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toItem = Math.min(currentPage * limit, total);
  const maxChartValue = chartData.length ? Math.max(...chartData.map((d) => d.value), 1) : 1;

  const periodLabel =
    monthFrom && monthTo
      ? `${new Date(monthFrom + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${new Date(monthTo + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      : "—";
  const latestReading = readings.length > 0 ? readings[0] : null;

  function applyFilters() {
    setPage(1);
    loadChartReadings();
    loadReadings(1);
  }

  function clearFilters() {
    const def = getDefaultMonthRange();
    setMonthFrom(def.from);
    setMonthTo(def.to);
    setPage(1);
  }

  if (loading && readings.length === 0) return <PageLoading />;

  return (
    <div className="min-h-screen min-w-0 w-full max-w-full overflow-x-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-800/80">
      <div className="mx-auto min-w-0 max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/meters/${id}`}
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Meter details
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Meter readings
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {meterLabel ?? `Meter ${id}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/40">
                <Droplets className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total readings
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Period
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{periodLabel}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none sm:col-span-2 lg:col-span-1">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Latest reading
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {latestReading
                    ? `${Number(latestReading.value).toLocaleString(undefined, { maximumFractionDigits: 4 })} m³`
                    : "—"}
                </p>
                {latestReading && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(latestReading.recordedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Filters</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From (month)</label>
              <input
                type="month"
                value={monthFrom}
                onChange={(e) => setMonthFrom(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To (month)</label>
              <input
                type="month"
                value={monthTo}
                onChange={(e) => setMonthTo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Per page</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Apply
            </Button>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Readings by month</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                From
                <input
                  type="month"
                  value={monthFrom}
                  onChange={(e) => setMonthFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                To
                <input
                  type="month"
                  value={monthTo}
                  onChange={(e) => setMonthTo(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>
              <Button variant="secondary" size="sm" onClick={applyFilters} disabled={chartLoading}>
                {chartLoading ? "Loading…" : "Apply"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {chartLoading && chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600 dark:border-slate-600 dark:border-t-teal-500" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/20 dark:text-slate-400">
                No readings in this range. Adjust the month range or add readings.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: "220px" }}>
                  {chartData.map((d) => (
                    <div key={d.month} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
                      <div className="w-full flex-1 flex flex-col justify-end">
                        <div
                          className="w-full rounded-t bg-teal-500 transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                          style={{ height: `${Math.max(8, (d.value / maxChartValue) * 180)}px` }}
                          title={`${d.label}: ${d.value} m³`}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{d.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Reading value (m³) per month. Hover over bars for values.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Readings list</span>
          </CardHeader>
          <CardContent className="p-0">
            {readings.length === 0 ? (
              <p className="py-12 text-center text-slate-500 dark:text-slate-400">
                No readings in this period. Adjust filters or add readings.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Date & time
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Reading (m³)
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Price/m³
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Recorded by
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {readings.map((r) => (
                        <tr
                          key={r.id}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                            {new Date(r.recordedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {Number(r.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-5 py-3.5 text-right text-slate-600 dark:text-slate-400">
                            {r.pricePerCubic != null ? `$${Number(r.pricePerCubic).toFixed(4)}` : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                            {r.recordedBy?.fullName ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/30">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {fromItem}–{toItem} of {total} readings
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
                    <span className="min-w-[120px] text-center text-sm text-slate-600 dark:text-slate-400">
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
