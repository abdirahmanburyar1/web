"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TenantCustomersPage() {
  const [data, setData] = useState<{
    customers: Array<{ id: string; fullName: string; email: string | null; meterNumber: string | null; zone: { name: string } | null }>;
    total: number;
    page: number;
  } | null>(null);
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
    fetch("/api/tenant/customers?limit=50", { headers: { Authorization: `Bearer ${t}` } })
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      {data && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Meter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.fullName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.meterNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.zone?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-sm text-slate-500">Total: {data.total}</p>
        </div>
      )}
    </div>
  );
}
