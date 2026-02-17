"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count: { users: number; meters: number; payments: number };
};

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState<{
    tenants: { total: number; active: number };
    transactions: number;
    revenue: number;
    totalPaymentsVolume: number;
  } | null>(null);
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
        <Link href="/platform/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview: tenants, revenue, and transaction volume."
        action={
          <Link href="/platform/tenants">
            <Button variant="platform">Manage tenants</Button>
          </Link>
        }
      />

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Key metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Active tenants</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{metrics!.tenants.active}</p>
              <p className="mt-1 text-xs text-slate-400">of {metrics!.tenants.total} total</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Transactions (all time)</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{metrics!.transactions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400">Tenant payment events</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Platform revenue</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">${metrics!.revenue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-400">From per-payment fees</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Tenant payment volume</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">${Number(metrics!.totalPaymentsVolume).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-400">Collected by tenants</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent tenants</h2>
          <Link href="/platform/tenants" className="text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline">
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
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Users</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Meters</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tenants.tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/platform/tenants/${t.id}`} className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-600">{t.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "ACTIVE" ? "success" : "warning"}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.users}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.meters}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.payments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <Card className="border-slate-200/80">
            <CardContent className="py-12 text-center text-slate-500">
              No tenants yet. <Link href="/platform/tenants" className="text-cyan-600 hover:underline">Create one</Link> from Tenants.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
