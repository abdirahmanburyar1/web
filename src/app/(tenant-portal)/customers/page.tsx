"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { TableWrapper } from "@/components/ui/table-responsive";
import { EmptyState } from "@/components/ui/empty";

export default function TenantCustomersPage() {
  const [data, setData] = useState<{
    customers: Array<{
      id: string;
      fullName: string;
      email: string | null;
      meterNumber: string | null;
      zone: { name: string } | null;
    }>;
    total: number;
    page: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    fetch("/api/tenant/customers?limit=50", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customers and meter information." />
      {data && (
        <>
          {data.customers.length === 0 ? (
            <EmptyState
              title="No customers yet"
              description="Add your first customer to get started."
            />
          ) : (
            <TableWrapper>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.fullName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{c.meterNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.zone?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">
                Total: {data.total} customer{data.total !== 1 ? "s" : ""}
              </div>
            </TableWrapper>
          )}
        </>
      )}
    </div>
  );
}
