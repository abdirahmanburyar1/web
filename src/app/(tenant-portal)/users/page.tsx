"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

type Permission = { id: string; code: string; name: string; module: string | null };
type Role = { id: string; name: string; description: string | null };
type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  roleType: string;
  roleId: string | null;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string } | null;
  directPermissions: Array<{ permission: { id: string; code: string; name: string } }>;
};

export default function TenantUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [total, setTotal] = useState(0);
  const [maxStaff, setMaxStaff] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    roleType: "STAFF",
    roleId: "",
    directPermissionIds: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    roleType: "STAFF",
    roleId: "",
    isActive: true,
    password: "",
    directPermissionIds: [] as string[],
  });
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
      fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/tenant/roles", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/tenant/permissions", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    ])
      .then(([usersData, rolesData, permsData]) => {
        if (usersData.error) setError(usersData.error);
        else {
          setUsers(usersData.users ?? []);
          setTotal(usersData.total ?? 0);
          setMaxStaff(usersData.maxStaff ?? null);
        }
        if (rolesData.error) setError((e) => e || rolesData.error);
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

  function openEdit(u: UserRow) {
    setEditingId(u.id);
    setEditForm({
      fullName: u.fullName,
      phoneNumber: u.phoneNumber ?? "",
      roleType: u.roleType,
      roleId: u.roleId ?? "",
      isActive: u.isActive,
      password: "",
      directPermissionIds: u.directPermissions.map((dp) => dp.permission.id),
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          fullName: createForm.fullName.trim(),
          phoneNumber: createForm.phoneNumber.trim() || undefined,
          roleType: createForm.roleType,
          roleId: createForm.roleId.trim() || undefined,
          directPermissionIds: createForm.directPermissionIds.length ? createForm.directPermissionIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }
      setUsers((prev) => [...prev, data]);
      setTotal((prev) => prev + 1);
      setCreateForm({
        email: "",
        password: "",
        fullName: "",
        phoneNumber: "",
        roleType: "STAFF",
        roleId: "",
        directPermissionIds: [],
      });
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
      const body: Record<string, unknown> = {
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim() || null,
        roleType: editForm.roleType,
        roleId: editForm.roleId.trim() || null,
        isActive: editForm.isActive,
        directPermissionIds: editForm.directPermissionIds,
      };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/tenant/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === editingId ? data : u)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: "Remove this user?",
      text: "They will lose access immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, remove",
    });
    if (!result.isConfirmed) return;
    const t = getToken();
    if (!t) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/tenant/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setTotal((prev) => prev - 1);
      if (editingId === id) setEditingId(null);
    } finally {
      setDeletingId(null);
    }
  }

  const toggleCreatePerm = (permId: string) => {
    setCreateForm((f) => ({
      ...f,
      directPermissionIds: f.directPermissionIds.includes(permId)
        ? f.directPermissionIds.filter((p) => p !== permId)
        : [...f.directPermissionIds, permId],
    }));
  };
  const toggleEditPerm = (permId: string) => {
    setEditForm((f) => ({
      ...f,
      directPermissionIds: f.directPermissionIds.includes(permId)
        ? f.directPermissionIds.filter((p) => p !== permId)
        : [...f.directPermissionIds, permId],
    }));
  };

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && !users.length) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <p className="mt-1 text-slate-500">
        Manage tenant users, roles, and permissions. Tenant admins have full authority.
      </p>
      {maxStaff != null && (
        <p className="mt-1 text-sm text-slate-500">
          Users: {total} / {maxStaff} (plan limit)
        </p>
      )}
      {error && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}

      <details className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-700">Create user</summary>
        <form onSubmit={handleCreate} className="border-t border-slate-200 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              placeholder="Full name"
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              placeholder="Phone"
              value={createForm.phoneNumber}
              onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <div>
              <label className="block text-xs text-slate-500">Role type</label>
              <select
                value={createForm.roleType}
                onChange={(e) => setCreateForm((f) => ({ ...f, roleType: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="STAFF">Staff</option>
                <option value="COLLECTOR">Collector</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500">Custom role (optional)</label>
              <select
                value={createForm.roleId}
                onChange={(e) => setCreateForm((f) => ({ ...f, roleId: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">— None —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Direct permissions (optional)</label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {permissions.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                  <input
                    type="checkbox"
                    checked={createForm.directPermissionIds.includes(p.id)}
                    onChange={() => toggleCreatePerm(p.id)}
                  />
                  {p.code}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating} className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50">
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      </details>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Role type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id}>
                {editingId === u.id ? (
                  <td colSpan={6} className="px-4 py-3 bg-teal-50/50">
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={editForm.fullName}
                          onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                          placeholder="Full name"
                          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                        <input
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                          placeholder="Phone"
                          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        />
                        <select
                          value={editForm.roleType}
                          onChange={(e) => setEditForm((f) => ({ ...f, roleType: e.target.value }))}
                          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="STAFF">Staff</option>
                          <option value="COLLECTOR">Collector</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="TENANT_ADMIN">Tenant Admin</option>
                        </select>
                        <select
                          value={editForm.roleId}
                          onChange={(e) => setEditForm((f) => ({ ...f, roleId: e.target.value }))}
                          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                        >
                          <option value="">— None —</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                          />
                          Active
                        </label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="New password (leave blank to keep)"
                          className="rounded border border-slate-300 px-2 py-1 text-sm w-48"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Direct permissions: </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {permissions.map((p) => (
                            <label key={p.id} className="inline-flex items-center gap-0.5 rounded bg-white border px-1.5 py-0.5 text-xs">
                              <input
                                type="checkbox"
                                checked={editForm.directPermissionIds.includes(p.id)}
                                onChange={() => toggleEditPerm(p.id)}
                              />
                              {p.code}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-teal-600 px-3 py-1.5 text-white text-sm hover:bg-teal-700 disabled:opacity-50">
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.fullName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.roleType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.role?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? "text-emerald-600 text-sm" : "text-slate-400 text-sm"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(u)} className="text-teal-600 hover:underline text-sm mr-2">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="text-red-600 hover:underline text-sm disabled:opacity-50"
                      >
                        {deletingId === u.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-6 text-slate-500 text-sm">No users yet. Create one above.</p>
        )}
      </div>
      <p className="mt-4 text-sm text-slate-500">
        <Link href="/roles" className="text-teal-600 hover:underline">Manage roles and permissions →</Link>
      </p>
    </div>
  );
}
