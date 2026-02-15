"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  _count?: { users: number; meters: number; invoices: number; payments: number };
};

type PlatformPayment = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  receipts: { id: string; receiptNumber: string | null; url: string | null; issuedAt: string }[];
};

type TenantUser = {
  id: string;
  email: string;
  fullName: string;
  roleType: string;
  isActive: boolean;
  createdAt: string;
};

const PLANS = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"] as const;

export default function PlatformTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
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
  const [paymentForm, setPaymentForm] = useState({ amount: "", currency: "USD", status: "PENDING", description: "" });
  const [addingPayment, setAddingPayment] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", fullName: "", password: "" });
  const [addingUser, setAddingUser] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    Promise.all([
      fetch(`/api/platform/tenants/${id}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) =>
        r.status === 404 ? Promise.reject(new Error("Not found")) : r.json()
      ),
      fetch(`/api/platform/tenants/${id}/payments`, { headers: { Authorization: `Bearer ${t}` } }).then((r) =>
        r.json().then((d) => (d.error ? [] : d))
      ),
      fetch(`/api/platform/tenants/${id}/users`, { headers: { Authorization: `Bearer ${t}` } }).then((r) =>
        r.json().then((d) => (d.error ? [] : d))
      ),
    ])
      .then(([tenantData, paymentsData, usersData]) => {
        if (tenantData.error) throw new Error(tenantData.error);
        setTenant(tenantData);
        setForm({
          name: tenantData.name,
          status: tenantData.status,
          subscriptionPlan: tenantData.subscriptionPlan,
          billingCycle: tenantData.billingCycle ?? "",
          maxStaff: tenantData.maxStaff ?? "",
          maxCustomers: tenantData.maxCustomers ?? "",
          maxTransactions: tenantData.maxTransactions ?? "",
        });
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setPaymentForm((f) => ({ ...f, currency: tenantData.currency || "USD" }));
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
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setTenant(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
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
      const res = await fetch(`/api/platform/tenants/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      router.replace("/tenants");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !paymentForm.amount.trim()) return;
    setAddingPayment(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/tenants/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          currency: paymentForm.currency,
          status: paymentForm.status,
          description: paymentForm.description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add payment");
      setPayments((prev) => [data, ...prev]);
      setPaymentForm({ amount: "", currency: tenant?.currency || "USD", status: "PENDING", description: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add payment");
    } finally {
      setAddingPayment(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !userForm.email.trim() || !userForm.fullName.trim() || !userForm.password.trim()) return;
    setAddingUser(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/tenants/${id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          email: userForm.email.trim(),
          fullName: userForm.fullName.trim(),
          password: userForm.password,
          roleType: "TENANT_ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setUsers((prev) => [data, ...prev]);
      setUserForm({ email: "", fullName: "", password: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  }

  if (loading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (error && !tenant) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/tenants" className="mt-4 inline-block text-cyan-600 hover:underline">
          ← Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tenants" className="text-sm text-cyan-600 hover:underline">
            ← Tenants
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{tenant?.name ?? "Tenant"}</h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {tenant?.slug}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tenant?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {tenant?.status}
          </span>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete tenant"}
        </Button>
      </div>
      {tenant && (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {/* Subscription & plans */}
          <Card className="mb-6">
            <CardHeader className="font-semibold text-slate-900">Subscription & plans</CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tenant name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Plan</label>
                    <select
                      value={form.subscriptionPlan}
                      onChange={(e) => setForm((f) => ({ ...f, subscriptionPlan: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Billing cycle</label>
                    <input
                      value={form.billingCycle}
                      onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
                      placeholder="e.g. monthly, quarterly"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
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
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Max meters</label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxCustomers}
                      onChange={(e) => setForm((f) => ({ ...f, maxCustomers: e.target.value }))}
                      placeholder="Unlimited"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving} variant="platform">
                  {saving ? "Saving…" : "Save subscription"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscription billing (platform) → receipts */}
          <Card className="mb-6">
            <CardHeader className="font-semibold text-slate-900">Subscription billing</CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAddPayment} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Currency</label>
                  <select
                    value={paymentForm.currency}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, currency: e.target.value }))}
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="SOS">SOS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Status</label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="block text-xs font-medium text-slate-500">Description</label>
                  <input
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <Button type="submit" disabled={addingPayment || !paymentForm.amount.trim()} size="sm" variant="platform">
                  {addingPayment ? "Adding…" : "Add billing record"}
                </Button>
              </form>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Amount</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Description</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Receipts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No billing records yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium">
                            {Number(p.amount).toLocaleString()} {p.currency}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                p.status === "PAID" ? "bg-emerald-100 text-emerald-800" : p.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.description || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {p.receipts?.length ? (
                              <span className="text-slate-600">{p.receipts.length} receipt(s)</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tenant admin user creation */}
          <Card>
            <CardHeader className="font-semibold text-slate-900">Tenant users</CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateUser} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="admin@company.com"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-slate-500">Full name</label>
                  <input
                    value={userForm.fullName}
                    onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Admin name"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-slate-500">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <Button type="submit" disabled={addingUser} size="sm" variant="platform">
                  {addingUser ? "Creating…" : "Create tenant admin"}
                </Button>
              </form>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Role</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          No users yet. Create a tenant admin above.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                          <td className="px-4 py-3 text-slate-600">{u.fullName}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              {u.roleType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {u.isActive ? (
                              <span className="text-emerald-600">Active</span>
                            ) : (
                              <span className="text-slate-500">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
