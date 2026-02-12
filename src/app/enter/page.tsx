"use client";

import { useState } from "react";
import Link from "next/link";

export default function EnterTenantPage() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!s) {
      setError("Enter your tenant subdomain (e.g. acme)");
      return;
    }
    setError("");
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocal) {
      window.location.href = `/login?tenant=${encodeURIComponent(s)}`;
      return;
    }
    window.location.href = `https://${s}.aquatrack.so/login`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/" className="font-semibold text-cyan-800">AquaTrack</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Tenant portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tenants use subdomains. Enter your tenant subdomain to sign in. Your tenant is identified by subdomain and session (tenant_id).
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div className="flex rounded-lg border border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-cyan-500">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme"
                className="flex-1 rounded-l-lg border-0 bg-transparent px-4 py-3 focus:ring-0"
              />
              <span className="flex items-center text-slate-500 pr-4">.aquatrack.so</span>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700"
            >
              Continue
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="text-cyan-600 hover:underline">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
