"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";

export default function CollectorDashboardPage() {
  const [stats, setStats] = useState<{ meters: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    fetch("/api/tenant/collector/my-meters", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats({ meters: d.total ?? 0 });
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (error && !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Collector dashboard"
        description="Your assigned meters and quick actions."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">My meters</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats?.meters ?? 0}</p>
            <Link href="/collector/meters" className="mt-3 inline-block">
              <Button variant="secondary" size="sm">View list</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Record payment</p>
            <p className="mt-1 text-sm text-slate-600">Record a customer payment for one of your meters.</p>
            <Link href="/collector/record-payment" className="mt-3 inline-block">
              <Button size="sm">Record payment</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Record reading</p>
            <p className="mt-1 text-sm text-slate-600">Submit a meter reading for one of your meters.</p>
            <Link href="/collector/record-reading" className="mt-3 inline-block">
              <Button size="sm">Record reading</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
