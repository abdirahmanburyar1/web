"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

type Price = {
  id: string;
  name: string;
  pricePerCubic: number | string;
  isDefault: boolean;
  _count?: { meters: number };
};

export default function TariffsPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceForm, setPriceForm] = useState({ name: "", pricePerCubic: "", isDefault: false });
  const [submitting, setSubmitting] = useState(false);
  const [priceSettingDefault, setPriceSettingDefault] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/prices", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setPrices(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load tariffs"))
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

  async function createPrice(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    const priceVal = parseFloat(priceForm.pricePerCubic);
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setError("Price per m³ must be a non-negative number");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: priceForm.name.trim(),
          pricePerCubic: priceVal,
          isDefault: priceForm.isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create tariff");
        return;
      }
      setPrices((prev) => [...prev, { ...data, _count: { meters: 0 } }]);
      setPriceForm({ name: "", pricePerCubic: "", isDefault: false });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function setPriceAsDefault(priceId: string) {
    const t = getToken();
    if (!t) return;
    setPriceSettingDefault(priceId);
    try {
      const res = await fetch(`/api/tenant/prices/${priceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Failed to set default");
        return;
      }
      setPrices((prev) => prev.map((p) => ({ ...p, isDefault: p.id === priceId })));
    } finally {
      setPriceSettingDefault(null);
    }
  }

  async function deletePrice(priceId: string) {
    const t = getToken();
    if (!t) return;
    if (!confirm("Remove this tariff? Meters using it will need another price assigned.")) return;
    try {
      const res = await fetch(`/api/tenant/prices/${priceId}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to delete");
        return;
      }
      setPrices((prev) => prev.filter((p) => p.id !== priceId));
    } catch {
      setError("Failed to delete");
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/setup" className="hover:text-teal-600 dark:hover:text-teal-400">Setup</Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">Tariffs</span>
      </div>
      <PageHeader
        title="Tariff rates"
        description="Price per m³ for each customer tier. One tariff can be set as default for new meters."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* Add tariff CTA */}
      {!showForm && (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 py-8 text-slate-600 dark:text-slate-400 transition hover:border-teal-400 hover:bg-teal-50/50 hover:text-teal-700 dark:hover:border-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-300"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Add tariff</span>
          </button>
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <Card className="mb-8 border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">New tariff</h3>
            <form onSubmit={createPrice} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div>
                <Label className="text-slate-600 dark:text-slate-400">Name</Label>
                <Input
                  value={priceForm.name}
                  onChange={(e) => setPriceForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Residential"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-400">Price per m³</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={priceForm.pricePerCubic}
                  onChange={(e) => setPriceForm((f) => ({ ...f, pricePerCubic: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={priceForm.isDefault}
                  onChange={(e) => setPriceForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Set as default
              </label>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding…" : "Add tariff"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setError(""); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tariff cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prices.length === 0 && !showForm ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20 p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No tariffs yet. Add one to assign to meters.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>Add tariff</Button>
          </div>
        ) : (
          prices.map((p) => (
            <Card
              key={p.id}
              className={`overflow-hidden transition-shadow hover:shadow-md ${
                p.isDefault ? "ring-2 ring-teal-500/50 dark:ring-teal-400/30" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</h3>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
                        {Number(p.pricePerCubic).toFixed(4)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ m³</span>
                      </p>
                    </div>
                    {p.isDefault ? (
                      <span className="shrink-0 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {(p._count?.meters ?? 0)} meter{(p._count?.meters ?? 0) === 1 ? "" : "s"} using this tariff
                  </p>
                </div>
                <div className="flex border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 gap-2">
                  {!p.isDefault && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={priceSettingDefault === p.id}
                      onClick={() => setPriceAsDefault(p.id)}
                    >
                      {priceSettingDefault === p.id ? "Setting…" : "Set default"}
                    </Button>
                  )}
                  {(p._count?.meters ?? 0) === 0 && (
                    <button
                      type="button"
                      onClick={() => deletePrice(p.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
