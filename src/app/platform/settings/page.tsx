"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    if (!getToken()) setError("Not authenticated");
    setLoading(false);
  }, []);

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
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-500">
        Global platform settings. Tenant-specific settings (zones, billing cycles, payment methods)
        are managed by each tenant in their portal.
      </p>
      <div className="mt-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Billing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Revenue is $0.1 per transaction. Billing cycles (monthly, quarterly) are configured per
            tenant in their portal.
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Payment methods</h2>
          <p className="mt-2 text-sm text-slate-600">
            Supported methods: Cash, Mobile money, Bank transfer. Tenants enable and label these in
            their own settings.
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Zones</h2>
          <p className="mt-2 text-sm text-slate-600">
            Zones (e.g. delivery areas) are defined per tenant. Platform does not manage zones
            globally.
          </p>
        </section>
      </div>
    </div>
  );
}
