"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";

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
      _count: { users: number; meters: number; payments: number };
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

  if (loading) return <PageLoading />;
  if (error || !getToken()) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error || "Unauthorized"}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: "Active tenants", value: metrics!.tenants.active, sub: `of ${metrics!.tenants.total} total` },
    { label: "Transactions", value: metrics!.transactions.toLocaleString() },
    { label: "Revenue ($0.1/txn)", value: `$${metrics!.revenue.toFixed(2)}`, color: "text-emerald-600" },
    { label: "Payments volume", value: `$${Number(metrics!.totalPaymentsVolume).toFixed(2)}` },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform metrics and recent tenants."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5 sm:p-6">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${s.color ?? "text-slate-900"}`}>
                {s.value}
              </p>
              {s.sub && <p className="mt-1 text-xs text-slate-400">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent tenants</h2>
          <Link href="/tenants" className="text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline">
            View all →
          </Link>
        </div>
        {tenants?.tenants?.length ? (
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meters</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tenants.tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/tenants/${t.id}`} className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{t.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "ACTIVE" ? "success" : "warning"}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.users}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.meters}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t._count.payments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              No tenants yet. Create one from <Link href="/tenants" className="text-cyan-600 hover:underline">Tenants</Link>.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
