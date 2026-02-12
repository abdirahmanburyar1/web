"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<{
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      subscriptionPlan: string;
      _count: { users: number; customers: number; payments: number };
    }>;
    total: number;
    page: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
    adminFullName: "",
  });

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/platform/tenants?limit=50", {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTenants(data);
      })
      .catch(() => setError("Failed to load tenants"));
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
    setLoading(false);
  }, []);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setCreating(true);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          ...createForm,
          subscriptionPlan: "BASIC",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create tenant");
        return;
      }
      setCreateForm({ name: "", slug: "", adminEmail: "", adminPassword: "", adminFullName: "" });
      setCreating(false);
      load();
    } catch {
      setError("Request failed");
      setCreating(false);
    }
  }

  async function toggleSuspend(id: string, currentStatus: string) {
    const t = getToken();
    if (!t) return;
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/platform/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) load();
  }

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
      <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <p className="mt-1 text-slate-500">Create and manage tenants. Suspended tenants cannot access portal or app.</p>

        <details className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700">Create tenant</summary>
          <form onSubmit={handleCreateTenant} className="border-t border-slate-200 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Tenant name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                placeholder="Slug (e.g. acme-water)"
                value={createForm.slug}
                onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                type="email"
                placeholder="Admin email"
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                placeholder="Admin full name"
                value={createForm.adminFullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminFullName: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                type="password"
                placeholder="Admin password"
                value={createForm.adminPassword}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminPassword: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                required
              />
            </div>
            <button type="submit" disabled={creating} className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50">
              {creating ? "Creating…" : "Create tenant"}
            </button>
          </form>
        </details>

        {tenants && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Customers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Payments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tenants.tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.slug}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.subscriptionPlan}</td>
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSuspend(t.id, t.status)}
                        className={
                          t.status === "ACTIVE"
                            ? "text-amber-600 hover:underline text-sm"
                            : "text-emerald-600 hover:underline text-sm"
                        }
                      >
                        {t.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
