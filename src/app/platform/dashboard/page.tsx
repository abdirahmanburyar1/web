"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState<{
    tenants: { total: number; active: number };
    transactions: number;
    revenue: number;
    totalPaymentsVolume: number;
  } | null>(null);
  const [tenants, setTenants] = useState<{
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      _count: { users: number; customers: number; payments: number };
    }>;
    total: number;
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
    const headers = { Authorization: `Bearer ${t}` };
    Promise.all([
      fetch("/api/platform/metrics", { headers }).then((r) => r.json()),
      fetch("/api/platform/tenants?limit=10", { headers }).then((r) => r.json()),
    ])
      .then(([metricsData, tenantsData]) => {
        if (metricsData.error) setError(metricsData.error);
        else setMetrics(metricsData);
        if (tenantsData.error) setError((e) => e || tenantsData.error);
        else setTenants(tenantsData);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard…</div>;
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Platform metrics and recent tenants.</p>
      {metrics && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active tenants</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.tenants.active}</p>
            <p className="text-xs text-slate-400">of {metrics.tenants.total} total</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Transactions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.transactions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Revenue ($0.1/txn)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              ${metrics.revenue.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Payments volume</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              ${Number(metrics.totalPaymentsVolume).toFixed(2)}
            </p>
          </div>
        </div>
      )}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent tenants</h2>
          <Link href="/tenants" className="text-sm font-medium text-cyan-600 hover:underline">
            View all
          </Link>
        </div>
        {tenants?.tenants?.length ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Customers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tenants.tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      <Link href={`/tenants/${t.id}`} className="text-cyan-600 hover:underline">{t.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.slug}</td>
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
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.users}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.customers}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.payments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-slate-500">No tenants yet. Create one from Tenants.</p>
        )}
      </div>
    </div>
  );
}
