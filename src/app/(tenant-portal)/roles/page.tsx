"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Permission = { id: string; code: string; name: string; module: string | null };
type RolePerm = { permission: { id: string; code: string; name: string } };
type Role = {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number };
  permissions: RolePerm[];
};

export default function TenantRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPermIds, setCreatePermIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPermIds, setEditPermIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    Promise.all([
      fetch("/api/tenant/roles", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/tenant/permissions", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    ])
      .then(([rolesData, permsData]) => {
        if (rolesData.error) setError(rolesData.error);
        else setRoles(Array.isArray(rolesData) ? rolesData : []);
        if (permsData.error) setError((e) => e || permsData.error);
        else setPermissions(Array.isArray(permsData) ? permsData : []);
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

  function openEdit(r: Role) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditDesc(r.description ?? "");
    setEditPermIds(r.permissions.map((p) => p.permission.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || undefined,
          permissionIds: createPermIds.length ? createPermIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      setRoles((prev) => [...prev, data]);
      setCreateName("");
      setCreateDesc("");
      setCreatePermIds([]);
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!editingId) return;
    const t = getToken();
    if (!t) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/roles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || undefined,
          permissionIds: editPermIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      setRoles((prev) => prev.map((r) => (r.id === editingId ? data : r)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role? Users must be reassigned first.")) return;
    const t = getToken();
    if (!t) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/tenant/roles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) setEditingId(null);
    } finally {
      setDeletingId(null);
    }
  }

  const toggleCreatePerm = (permId: string) => {
    setCreatePermIds((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };
  const toggleEditPerm = (permId: string) => {
    setEditPermIds((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !roles.length) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const m = p.module || "Other";
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Roles</h1>
      <p className="mt-1 text-slate-500">Create and manage roles. Assign permissions to roles, then assign roles to users.</p>
      {error && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}

      <details className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700">Create role</summary>
        <form onSubmit={handleCreate} className="border-t border-slate-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto rounded border border-slate-200 p-2">
              {Object.entries(byModule).map(([mod, perms]) => (
                <div key={mod} className="w-full">
                  <span className="text-xs font-medium text-slate-500">{mod}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {perms.map((p) => (
                      <label key={p.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                        <input
                          type="checkbox"
                          checked={createPermIds.includes(p.id)}
                          onChange={() => toggleCreatePerm(p.id)}
                        />
                        {p.code}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating} className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50">
            {creating ? "Creating…" : "Create role"}
          </button>
        </form>
      </details>

      <div className="mt-6 space-y-4">
        {roles.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {editingId === r.id ? (
              <div className="space-y-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-medium"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div>
                  <span className="text-xs font-medium text-slate-500">Permissions</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {permissions.map((p) => (
                      <label key={p.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                        <input
                          type="checkbox"
                          checked={editPermIds.includes(p.id)}
                          onChange={() => toggleEditPerm(p.id)}
                        />
                        {p.code}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-teal-600 px-3 py-1.5 text-white text-sm hover:bg-teal-700 disabled:opacity-50">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{r.name}</h2>
                  {r.description && <p className="text-sm text-slate-500 mt-0.5">{r.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {r._count.users} user(s) · {r.permissions.length} permission(s)
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.permissions.slice(0, 8).map((rp) => (
                      <span key={rp.permission.id} className="rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-800">
                        {rp.permission.code}
                      </span>
                    ))}
                    {r.permissions.length > 8 && <span className="text-xs text-slate-400">+{r.permissions.length - 8} more</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(r)} className="text-teal-600 hover:underline text-sm">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id || r._count.users > 0}
                    className="text-red-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === r.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {roles.length === 0 && !createOpen && (
        <p className="mt-6 text-slate-500">No roles yet. Create one above or assign users in Users.</p>
      )}
    </div>
  );
}
