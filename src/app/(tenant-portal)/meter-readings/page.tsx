"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MeterReadingsPage() {
  const [data, setData] = useState<{ readings: unknown[]; total: number } | null>(null);
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
    fetch("/api/tenant/meter-readings?limit=50", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error || !getToken()) {
    return (
      <div>
        <p className="text-red-600">{error || "Unauthorized"}</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  const readings = (data?.readings ?? []) as Array<{ id: string; value: number; unit?: string; customer?: { fullName: string }; recordedAt: string }>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Meter readings</h1>
      <p className="mt-1 text-slate-500">View recorded meter readings.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {readings.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{r.customer?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{Number(r.value)} {r.unit ?? "m³"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.recordedAt ? new Date(r.recordedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-sm text-slate-500">Total: {data?.total ?? 0}</p>
      </div>
    </div>
  );
}
