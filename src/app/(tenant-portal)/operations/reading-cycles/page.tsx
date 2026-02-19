"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ReadingCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
  createdAt: string;
  _count?: { readings: number };
};

export default function ReadingCyclesPage() {
  const [cycles, setCycles] = useState<ReadingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    setLoading(true);
    fetch("/api/tenant/reading-cycles", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setCycles(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load cycles"))
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
    if (!t) return;
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError("Name, start date and end date are required");
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start > end) {
      setError("Start date must be before end date");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/reading-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create cycle");
        return;
      }
      setCycles((prev) => [data, ...prev]);
      setForm({ name: "", startDate: "", endDate: "" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(cycleId: string) {
    const t = getToken();
    if (!t) return;
    if (!confirm("Close this cycle? No new readings can be added for this period after closing.")) return;
    setClosingId(cycleId);
    try {
      const res = await fetch(`/api/tenant/reading-cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ isClosed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to close cycle");
        return;
      }
      setCycles((prev) => prev.map((c) => (c.id === cycleId ? { ...c, ...data } : c)));
    } finally {
      setClosingId(null);
    }
  }

  if (loading && cycles.length === 0) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Reading cycles"
        description="Define periods (e.g. monthly) for meter readings. When a cycle is closed, no new readings can be added for that period."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      )}

      <Card className="mb-8 border-teal-200 dark:border-teal-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-slate-900 dark:text-slate-100">New cycle</span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Create a period (e.g. &quot;January 2025&quot;) so readings recorded in that range are linked to it. Close the cycle when the period is finished to lock it.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-slate-600 dark:text-slate-400">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. January 2025"
                className="mt-1 w-48"
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-400">Start date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-400">End date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create cycle"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Cycles</span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Readings recorded on a date inside a cycle’s range are attached to that cycle. Closed cycles cannot receive new readings.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {cycles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              No reading cycles yet. Create one above (e.g. current month) so new readings are linked to it.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Period</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Readings</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(c.startDate).toLocaleDateString(undefined, { dateStyle: "short" })}
                        {" – "}
                        {new Date(c.endDate).toLocaleDateString(undefined, { dateStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        {c.isClosed ? (
                          <Badge variant="default" className="bg-slate-500">Closed</Badge>
                        ) : (
                          <Badge variant="success">Open</Badge>
                        )}
                        {c.closedAt && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            closed {new Date(c.closedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {c._count?.readings ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!c.isClosed && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={closingId === c.id}
                            onClick={() => handleClose(c.id)}
                          >
                            {closingId === c.id ? "Closing…" : "Close cycle"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
