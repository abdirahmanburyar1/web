"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

type MoneyAccount = {
  id: string;
  name: string;
  type: string;
  accountNumber: string | null;
  sortOrder: number;
};

const ACCOUNT_TYPES = [
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK", label: "Bank account" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
] as const;

export default function MoneyAccountsPage() {
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "MOBILE_MONEY", accountNumber: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/money-accounts", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setAccounts(Array.isArray(data) ? data : []);
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

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", type: "MOBILE_MONEY", accountNumber: "", sortOrder: accounts.length });
    setFormOpen(true);
  }

  function openEdit(a: MoneyAccount) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      type: a.type,
      accountNumber: a.accountNumber ?? "",
      sortOrder: a.sortOrder,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        accountNumber: form.accountNumber.trim() || null,
        sortOrder: form.sortOrder,
      };
      if (editingId) {
        const res = await fetch(`/api/tenant/money-accounts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update");
        setAccounts((prev) => prev.map((a) => (a.id === editingId ? data : a)));
      } else {
        const res = await fetch("/api/tenant/money-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to create");
        setAccounts((prev) => [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const t = getToken();
    if (!t || !confirm("Remove this account from receipts?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tenant/money-accounts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Failed to delete");
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <PageLoading />;
  if (error && accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/settings" className="mt-4 inline-block">
          <Button variant="secondary">Back to Settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Money accounts"
        description="Bank accounts, mobile money numbers, and other payment details. These appear on printed receipts so customers know where to pay."
        backLink={{ href: "/settings", label: "Settings" }}
        action={<Button onClick={openCreate}>+ Add account</Button>}
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      <Card>
        <CardHeader className="font-medium text-slate-900">Receipt payment accounts</CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-500">
            Most companies use mobile money and bank accounts. Add each account by name and number (e.g. Sahal Account 514458, eDahab 87885, Salam Bank 0221548585). These appear on printed receipts as plain text so customers know where to pay.
          </p>
          {accounts.length === 0 && !formOpen ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-sm text-slate-500">
              No money accounts yet. Add one to show on receipts.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Account name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600">Account number</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{a.accountNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="mr-2 text-sm font-medium text-teal-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === a.id ? "Deleting…" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {formOpen && (
            <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-4 font-medium text-slate-900">{editingId ? "Edit account" : "Add account"}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Account name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Sahal Account, eDahab, Salam Bank"
                    required
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Account number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="e.g. 514458, 87885, 0221548585"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Update" : "Add"}</Button>
                <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
