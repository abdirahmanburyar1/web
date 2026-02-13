"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Setting = { id: string; key: string; value: unknown };

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createValue, setCreateValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/platform/settings", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSettings(Array.isArray(data) ? data : []);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !createKey.trim()) return;
    setCreating(true);
    setError("");
    try {
      let value: unknown = createValue.trim();
      try {
        value = JSON.parse(createValue.trim());
      } catch {
        // keep as string
      }
      const res = await fetch("/api/platform/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ key: createKey.trim(), value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      setSettings((prev) => [...prev, data]);
      setCreateKey("");
      setCreateValue("");
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(s: Setting) {
    setEditingId(s.id);
    setEditValue(typeof s.value === "string" ? s.value : JSON.stringify(s.value, null, 2));
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const t = getToken();
    if (!t) return;
    setSaving(true);
    setError("");
    try {
      let value: unknown = editValue;
      try {
        value = JSON.parse(editValue);
      } catch {
        value = editValue;
      }
      const res = await fetch(`/api/platform/settings/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      setSettings((prev) => prev.map((s) => (s.id === editingId ? data : s)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this setting?")) return;
    const t = getToken();
    if (!t) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/platform/settings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        return;
      }
      setSettings((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) setEditingId(null);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !settings.length) {
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
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-500">
        Global platform settings (key-value). Use for billing, feature flags, or any config.
      </p>
      {error && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}

      <details className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700">Create setting</summary>
        <form onSubmit={handleCreate} className="border-t border-slate-200 p-4 space-y-3">
          <input
            placeholder="Key (e.g. billing.revenue_per_txn)"
            value={createKey}
            onChange={(e) => setCreateKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <textarea
            placeholder="Value (JSON or plain text)"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          <button type="submit" disabled={creating} className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50">
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      </details>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Value</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {settings.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900 font-mono">{s.key}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {editingId === s.id ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={2}
                      className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-xs break-all">
                      {typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === s.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit()}
                        disabled={saving}
                        className="text-cyan-600 hover:underline text-sm mr-2"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:underline text-sm">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(s)} className="text-cyan-600 hover:underline text-sm mr-2">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="text-red-600 hover:underline text-sm disabled:opacity-50"
                      >
                        {deletingId === s.id ? "Deleting…" : "Delete"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settings.length === 0 && (
          <p className="px-4 py-6 text-slate-500 text-sm">No settings yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
