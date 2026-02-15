"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import Swal from "sweetalert2";

type Meter = { id: string; meterNumber: string; customerName: string };

export default function CollectorRecordReadingPage() {
  const searchParams = useSearchParams();
  const preselectedMeterId = searchParams.get("meterId") ?? "";
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState(preselectedMeterId);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("m³");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    fetch("/api/tenant/collector/my-meters", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setMeters(d.meters ?? []);
          if (preselectedMeterId && !meterId) setMeterId(preselectedMeterId);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [preselectedMeterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !meterId || value === "" || Number(value) < 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/meter-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          meterId,
          value: Number(value),
          unit: unit || "m³",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record reading");
        return;
      }
      await Swal.fire({ title: "Recorded", text: "Meter reading recorded successfully.", icon: "success", timer: 2000, showConfirmButton: false });
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && meters.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/collector" className="mt-4 inline-block text-teal-600 hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Record reading"
        description="Submit a meter reading for one of your assigned meters."
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Meter *</Label>
              <select
                value={meterId}
                onChange={(e) => setMeterId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                required
              >
                <option value="">— Select meter —</option>
                {meters.map((m) => (
                  <option key={m.id} value={m.id}>{m.meterNumber} — {m.customerName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Reading value *</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>Unit</Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              >
                <option value="m³">m³</option>
                <option value="L">L</option>
                <option value="gal">gal</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting || !meterId || value === ""}>{submitting ? "Recording…" : "Record reading"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
