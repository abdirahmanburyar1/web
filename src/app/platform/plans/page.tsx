"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !limits.length) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Subscription plans</h1>
      <p className="mt-1 text-slate-500">
        Default limits per plan. Assign plans to tenants on the Tenants page; override limits per tenant when editing a tenant.
      </p>
      {error && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {limits.map((p) => {
          const e = editing[p.plan] ?? { maxStaff: "", maxCustomers: "", maxTransactions: "" };
          return (
            <div
              key={p.plan}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{p.plan}</h2>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs text-slate-500">Max staff</label>
                  <input
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
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Max customers</label>
                  <input
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
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Max transactions/period</label>
                  <input
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
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSave(p.plan)}
                disabled={saving === p.plan}
                className="mt-4 w-full rounded-lg bg-cyan-600 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving === p.plan ? "Saving…" : "Save"}
              </button>
            </div>
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
