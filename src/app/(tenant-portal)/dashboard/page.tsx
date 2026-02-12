"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Overview of your customers and collections.</p>
      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active customers</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.customersCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Payments this month</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.paymentsThisMonth}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Collected this month</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              ${Number(stats.totalCollectedThisMonth).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Overdue invoices</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.overdueInvoices}</p>
          </div>
        </div>
      )}
    </div>
  );
}
