"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

export default function MeterReadingsPage() {
  const params = useParams();
  const id = params.id as string;
  const [readings, setReadings] = useState<Reading[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [meterLabel, setMeterLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  const loadReadings = useCallback(() => {
    const t = getToken();
    if (!t || !id) return;
    setLoading(true);
    setError("");
    fetch(
      `/api/tenant/meter-readings?meterId=${encodeURIComponent(id)}&page=${page}&limit=${limit}`,
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
  }, [id, page, limit]);

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

  if (loading && readings.length === 0) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Meter readings"
        description={meterLabel ?? `Meter ${id}`}
        backLink={{ href: `/meters/${id}`, label: "Meter details" }}
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Per page</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="font-semibold text-slate-900">
          Readings ({total})
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="py-6 text-center text-slate-500">No readings recorded yet for this meter.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date & time</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Reading (m³)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Price/m³</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {readings.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {new Date(r.recordedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          {Number(r.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {r.pricePerCubic != null ? `$${Number(r.pricePerCubic).toFixed(4)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.recordedBy?.fullName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
                <span>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
