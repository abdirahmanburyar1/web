"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

export default function TenantDashboardPage() {
  const [stats, setStats] = useState<{
    customersCount: number;
    paymentsThisMonth: number;
    totalCollectedThisMonth: number;
    overdueInvoices: number;
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
    fetch("/api/tenant/dashboard", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("Failed to load dashboard"))
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
    { label: "Active customers", value: stats!.customersCount, color: "text-slate-900" },
    { label: "Payments this month", value: stats!.paymentsThisMonth, color: "text-slate-900" },
    { label: "Collected this month", value: `$${Number(stats!.totalCollectedThisMonth).toFixed(2)}`, color: "text-emerald-600" },
    { label: "Overdue invoices", value: stats!.overdueInvoices, color: "text-amber-600" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your customers and collections."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5 sm:p-6">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${s.color}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
