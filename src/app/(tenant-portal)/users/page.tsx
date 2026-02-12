"use client";

import Link from "next/link";

export default function UsersPage() {
  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }
  if (!getToken()) {
    return (
      <div>
        <p className="text-red-600">Unauthorized</p>
        <Link href="/login" className="mt-4 inline-block text-cyan-600 hover:underline">Go to login</Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <p className="mt-1 text-slate-500">Tenant users, roles, and permissions.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">User management (create, edit, deactivate, assign roles or direct permissions) will be available here.</p>
      </div>
    </div>
  );
}
