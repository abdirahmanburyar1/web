"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

type PlanLimit = {
  plan: string;
  maxStaff: number | null;
  maxCustomers: number | null;
  maxTransactions: number | null;
};

export default function PlatformPlansPage() {
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { maxStaff: string; maxCustomers: string; maxTransactions: string }>>({});

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/platform/plans", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setLimits(Array.isArray(data) ? data : []);
          setEditing(
            (Array.isArray(data) ? data : []).reduce(
              (acc, p: PlanLimit) => ({
                ...acc,
                [p.plan]: {
                  maxStaff: p.maxStaff == null ? "" : String(p.maxStaff),
                  maxCustomers: p.maxCustomers == null ? "" : String(p.maxCustomers),
                  maxTransactions: p.maxTransactions == null ? "" : String(p.maxTransactions),
                },
              }),
              {} as Record<string, { maxStaff: string; maxCustomers: string; maxTransactions: string }>
            )
          );
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
  }, []);

  async function handleSave(plan: string) {
    const t = getToken();
    if (!t) return;
    const e = editing[plan];
    if (!e) return;
    setSaving(plan);
    try {
      const res = await fetch(`/api/platform/plans/${plan}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          maxStaff: e.maxStaff === "" ? null : Number(e.maxStaff),
          maxCustomers: e.maxCustomers === "" ? null : Number(e.maxCustomers),
          maxTransactions: e.maxTransactions === "" ? null : Number(e.maxTransactions),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      setLimits((prev) => prev.map((p) => (p.plan === plan ? data : p)));
      setError("");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !limits.length) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        description="Default limits per plan. Assign plans to tenants on the Tenants page; override per tenant when editing."
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {limits.map((p) => {
          const e = editing[p.plan] ?? { maxStaff: "", maxCustomers: "", maxTransactions: "" };
          return (
            <Card key={p.plan} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5 sm:p-6">
                <h2 className="font-semibold text-slate-900">{p.plan}</h2>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Max staff</Label>
                    <Input
                      type="number"
                      min={0}
                      value={e.maxStaff}
                      onChange={(ev) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.plan]: { ...prev[p.plan], maxStaff: ev.target.value },
                        }))
                      }
                      placeholder="Unlimited"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Max customers</Label>
                    <Input
                      type="number"
                      min={0}
                      value={e.maxCustomers}
                      onChange={(ev) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.plan]: { ...prev[p.plan], maxCustomers: ev.target.value },
                        }))
                      }
                      placeholder="Unlimited"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Max transactions/period</Label>
                    <Input
                      type="number"
                      min={0}
                      value={e.maxTransactions}
                      onChange={(ev) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.plan]: { ...prev[p.plan], maxTransactions: ev.target.value },
                        }))
                      }
                      placeholder="Unlimited"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="platform"
                  className="mt-4 w-full"
                  onClick={() => handleSave(p.plan)}
                  disabled={saving === p.plan}
                >
                  {saving === p.plan ? "Saving…" : "Save"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        <Link href="/tenants" className="text-cyan-600 hover:underline">
          Manage tenants and assign plans →
        </Link>
      </p>
    </div>
  );
}
