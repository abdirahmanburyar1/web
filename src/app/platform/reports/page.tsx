"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  _count: { users: number; meters: number; payments: number };
};

export default function PlatformReportsPage() {
  const [tenants, setTenants] = useState<{ tenants: TenantRow[]; total: number } | null>(null);
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
    fetch("/api/platform/tenants?limit=200", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTenants(data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    const t = getToken();
    if (!t) return;
    const res = await fetch("/api/platform/reports/export?format=csv", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error || !getToken()) {
    return (
      <div>
        <p className="text-red-600">{error || "Unauthorized"}</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  const revenuePerTxn = 0.1;
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-slate-500">
        Per-tenant usage and revenue. Export for reporting or billing.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Export CSV
        </button>
      </div>
      {tenants && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Users</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Meters</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Transactions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tenants.tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.slug}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.subscriptionPlan}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        t.status === "ACTIVE"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                          : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">{t._count.users}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">{t._count.meters}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">{t._count.payments}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                    ${(t._count.payments * revenuePerTxn).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-sm text-slate-500">Total: {tenants.total} tenants</p>
        </div>
      )}
    </div>
  );
}
