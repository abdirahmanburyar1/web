"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  billingCycle: string | null;
  currency: string;
  maxStaff: number | null;
  maxCustomers: number | null;
  maxTransactions: number | null;
  _count?: { users: number; customers: number; invoices: number; payments: number };
};

export default function PlatformTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    status: "ACTIVE",
    subscriptionPlan: "BASIC",
    billingCycle: "",
    maxStaff: "" as string | number,
    maxCustomers: "" as string | number,
    maxTransactions: "" as string | number,
  });

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch(`/api/platform/tenants/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => {
        if (r.status === 404) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTenant(data);
        setForm({
          name: data.name,
          status: data.status,
          subscriptionPlan: data.subscriptionPlan,
          billingCycle: data.billingCycle ?? "",
          maxStaff: data.maxStaff ?? "",
          maxCustomers: data.maxCustomers ?? "",
          maxTransactions: data.maxTransactions ?? "",
        });
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
          subscriptionPlan: form.subscriptionPlan,
          billingCycle: form.billingCycle || undefined,
          maxStaff: form.maxStaff === "" ? undefined : Number(form.maxStaff),
          maxCustomers: form.maxCustomers === "" ? undefined : Number(form.maxCustomers),
          maxTransactions: form.maxTransactions === "" ? undefined : Number(form.maxTransactions),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      setTenant(data);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this tenant and all its data? This cannot be undone.")) return;
    const t = getToken();
    if (!t) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/tenants/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        return;
      }
      router.replace("/tenants");
      router.refresh();
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !tenant) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/tenants" className="mt-4 inline-block text-cyan-600 hover:underline">
          ← Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tenants" className="text-cyan-600 hover:underline text-sm">
          ← Tenants
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{tenant?.name ?? "Edit tenant"}</h1>
      </div>
      {tenant && (
        <>
          <p className="text-slate-500 text-sm mb-4">
            Slug: <span className="font-mono">{tenant.slug}</span>
            {tenant._count && (
              <span className="ml-4">
                Users: {tenant._count.users} · Customers: {tenant._count.customers} · Payments: {tenant._count.payments}
              </span>
            )}
          </p>
          <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Subscription plan</label>
              <select
                value={form.subscriptionPlan}
                onChange={(e) => setForm((f) => ({ ...f, subscriptionPlan: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="BASIC">BASIC</option>
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Billing cycle</label>
              <input
                value={form.billingCycle}
                onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                placeholder="e.g. monthly, quarterly"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Max staff</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxStaff}
                  onChange={(e) => setForm((f) => ({ ...f, maxStaff: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Max customers</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxCustomers}
                  onChange={(e) => setForm((f) => ({ ...f, maxCustomers: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Max transactions</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxTransactions}
                  onChange={(e) => setForm((f) => ({ ...f, maxTransactions: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete tenant"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
