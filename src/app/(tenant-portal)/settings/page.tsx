"use client";

import Link from "next/link";

export default function SettingsPage() {
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
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-500">Zones, billing cycles, payment methods.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Tenant-specific settings (zones, billing cycle, payment methods, collector assignments) will be manageable here.</p>
      </div>
    </div>
  );
}
