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
  feePerPayment: string | number;
  _count: { users: number; meters: number; payments: number };
};

export default function PlatformReportsPage() {
  const [tenants, setTenants] = useState<{ tenants: TenantRow[]; total: number } | null>(null);
  const [metrics, setMetrics] = useState<{ revenue: number; transactions: number; tenants: { active: number; total: number } } | null>(null);
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
      fetch("/api/platform/tenants?limit=500", { headers }).then((r) => r.json()),
    ])
      .then(([metricsData, tenantsData]) => {
        if (metricsData.error) setError(metricsData.error);
        else setMetrics(metricsData);
        if (tenantsData.error) setError((e) => e || tenantsData.error);
        else setTenants(tenantsData);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    const t = getToken();
    if (!t) return;
    const res = await fetch("/api/platform/reports/export?format=csv", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  const revenueFor = (t: TenantRow) => t._count.payments * Number(t.feePerPayment ?? 0.2);
  const totalRevenue = tenants?.tenants?.reduce((sum, t) => sum + revenueFor(t), 0) ?? metrics?.revenue ?? 0;

  return (
    <div>
      <PageHeader
        title="Reports & revenue"
        description="Platform revenue, tenant usage, and export for billing or reporting."
        action={
          <Button variant="platform" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Platform revenue (all time)</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">${totalRevenue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-400">From per-payment fees</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Total transactions</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{metrics?.transactions?.toLocaleString() ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-400">Across all tenants</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">Tenants</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{metrics?.tenants?.active ?? "—"} active</p>
              <p className="mt-1 text-xs text-slate-400">of {metrics?.tenants?.total ?? "—"} total</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Per-tenant usage & revenue</h2>
        {tenants && (
          <TableWrapper>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Fee/payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Users</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Meters</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Transactions</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</th>
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
                    <td className="px-4 py-3 text-sm text-slate-600">${Number(t.feePerPayment ?? 0.2).toFixed(4)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "ACTIVE" ? "success" : "warning"}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.users}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.meters}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">{t._count.payments}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">${revenueFor(t).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">
              Total: {tenants.total} tenant{tenants.total !== 1 ? "s" : ""}
            </div>
          </TableWrapper>
        )}
      </section>
    </div>
  );
}
