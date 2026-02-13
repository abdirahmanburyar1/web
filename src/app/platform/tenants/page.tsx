"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";

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
  const [createOpen, setCreateOpen] = useState(false);
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
    fetch("/api/platform/tenants?limit=50", { headers: { Authorization: `Bearer ${t}` } })
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
    setError("");
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ ...createForm, subscriptionPlan: "BASIC" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create tenant");
        return;
      }
      setCreateForm({ name: "", slug: "", adminEmail: "", adminPassword: "", adminFullName: "" });
      setCreateOpen(false);
      load();
    } catch {
      setError("Request failed");
    } finally {
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

  if (loading) return <PageLoading />;
  if (error && !tenants) {
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
        title="Tenants"
        description="Create and manage tenants. Suspended tenants cannot access portal or app."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setCreateOpen((o) => !o)}
        >
          <span className="font-medium text-slate-800">
            {createOpen ? "−" : "+"} Create tenant
          </span>
        </CardHeader>
        {createOpen && (
          <CardContent className="border-t border-slate-100 pt-4">
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Tenant name</Label>
                  <Input
                    placeholder="Acme Water"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Slug</Label>
                  <Input
                    placeholder="acme-water"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Admin email</Label>
                  <Input
                    type="email"
                    placeholder="admin@acme.com"
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Admin full name</Label>
                  <Input
                    placeholder="Jane Doe"
                    value={createForm.adminFullName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, adminFullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Admin password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm((f) => ({ ...f, adminPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="platform" disabled={creating}>
                {creating ? "Creating…" : "Create tenant"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {tenants && (
        <TableWrapper>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customers</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payments</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
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
                  <td className="px-4 py-3 text-sm text-slate-600">{t.subscriptionPlan}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.status === "ACTIVE" ? "success" : "warning"}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t._count.users}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t._count.customers}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t._count.payments}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tenants/${t.id}`} className="text-sm font-medium text-cyan-600 hover:underline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSuspend(t.id, t.status)}
                        className={`text-sm font-medium ${t.status === "ACTIVE" ? "text-amber-600 hover:underline" : "text-emerald-600 hover:underline"}`}
                      >
                        {t.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">
            Total: {tenants.total} tenant{tenants.total !== 1 ? "s" : ""}
          </div>
        </TableWrapper>
      )}
    </div>
  );
}
