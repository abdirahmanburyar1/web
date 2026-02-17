"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableWrapper } from "@/components/ui/table-responsive";
import { EmptyState } from "@/components/ui/empty";

type Reading = {
  id: string;
  value: number | string;
  unit: string | null;
  pricePerCubic: number | string | null;
  recordedAt: string;
  meter: { id: string; meterNumber: string; customerName: string; price?: { id: string; name: string; pricePerCubic: number | string } | null };
  recordedBy: { id: string; fullName: string } | null;
};

const PAGE_SIZES = [25, 50, 100] as const;

export default function MeterReadingsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ readings: Reading[]; total: number; page: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meterId, setMeterId] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM for month input
  const [to, setTo] = useState("");     // YYYY-MM for month input
  const [recordedById, setRecordedById] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [recordedByUsers, setRecordedByUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const hasInitializedFromUrl = useRef(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  // Convert YYYY-MM to API date range (first day of month, last day of month)
  const fromApi = from ? `${from}-01` : "";
  const toApi = to
    ? (() => {
        const [y, m] = to.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        return `${to}-${String(lastDay).padStart(2, "0")}`;
      })()
    : "";

  const load = useCallback(() => {
    const t = getToken();
    if (!t) return;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (meterId) params.set("meterId", meterId);
    if (fromApi) params.set("from", fromApi);
    if (toApi) params.set("to", toApi);
    if (recordedById) params.set("recordedById", recordedById);
    setLoading(true);
    fetch(`/api/tenant/meter-readings?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({
          readings: d.readings ?? [],
          total: d.total ?? 0,
          page: d.page ?? page,
          limit: d.limit ?? limit,
        });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [page, limit, meterId, fromApi, toApi, recordedById]);

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
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setRecordedByUsers(d?.users ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    const m = searchParams.get("meterId")?.trim();
    const f = searchParams.get("from")?.trim();
    const tParam = searchParams.get("to")?.trim();
    if (m) setMeterId(m);
    if (f) setFrom(f);
    if (tParam) setTo(tParam);
    hasInitializedFromUrl.current = true;
  }, [searchParams]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const currentPage = data?.page ?? 1;

  if (error && !data && !loading) {
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
        title="Meter readings"
        description={meterId ? "Readings for the selected meter. Filter by month range or who recorded." : "Select a meter from the Meters page to view its readings, or use the link from a meter detail."
        }
        action={
          <Link href="/meters">
            <Button variant="secondary">Meters</Button>
          </Link>
        }
      />
      {error && data && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From month</label>
          <Input
            type="month"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="min-w-[140px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To month</label>
          <Input
            type="month"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="min-w-[140px]"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Recorded by</label>
          <select
            value={recordedById}
            onChange={(e) => { setRecordedById(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Anyone</option>
            {recordedByUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setFrom(""); setTo(""); setRecordedById(""); setPage(1); }}>
          Clear filters
        </Button>
        <div className="ml-auto">
          <label className="mb-1 block text-xs font-medium text-slate-500">Per page</label>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <PageLoading />
      ) : data?.readings.length === 0 ? (
        <EmptyState
          title="No readings found"
          description="Record readings from the collector flow or adjust your filters."
          action={<Link href="/meters"><Button>View meters</Button></Link>}
        />
      ) : (
        <>
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Recorded</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Price/m³</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.readings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {new Date(r.recordedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/meters/${r.meter.id}`} className="font-mono text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline">
                        {r.meter.meterNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{r.meter.customerName}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-slate-900">
                      {Number(r.value).toLocaleString()} {r.unit ?? "m³"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {r.pricePerCubic != null ? Number(r.pricePerCubic).toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.recordedBy?.fullName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
            <span>
              Showing {(currentPage - 1) * (data?.limit ?? 0) + 1}–{Math.min(currentPage * (data?.limit ?? 0), data?.total ?? 0)} of {data?.total ?? 0} readings
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
