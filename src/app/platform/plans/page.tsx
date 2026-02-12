"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PLAN_LIMITS: Record<string, { staff?: number; customers?: number; transactions?: number }> = {
  BASIC: { staff: 5, customers: 500, transactions: 1000 },
  STANDARD: { staff: 20, customers: 2000, transactions: 10000 },
  PREMIUM: { staff: 100, customers: 10000, transactions: 100000 },
  ENTERPRISE: {},
};

export default function PlatformPlansPage() {
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
      <h1 className="text-2xl font-bold text-slate-900">Subscription plans</h1>
      <p className="mt-1 text-slate-500">
        Default limits per plan. Assign plans to tenants on the Tenants page; you can override
        limits per tenant when editing.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"] as const).map((plan) => {
          const limits = PLAN_LIMITS[plan] ?? {};
          return (
            <div
              key={plan}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{plan}</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>
                  Max staff: {limits.staff != null ? limits.staff : "Unlimited"}
                </li>
                <li>
                  Max customers: {limits.customers != null ? limits.customers : "Unlimited"}
                </li>
                <li>
                  Max transactions/period:{" "}
                  {limits.transactions != null ? limits.transactions : "Unlimited"}
                </li>
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        <Link href="/tenants" className="text-cyan-600 hover:underline">
          Manage tenants and assign plans →
        </Link>
      </p>
    </div>
  );
}
