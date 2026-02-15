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

export default function CollectorRecordPaymentPage() {
  const searchParams = useSearchParams();
  const preselectedMeterId = searchParams.get("meterId") ?? "";
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState(preselectedMeterId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
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
    if (!t || !meterId || !amount || Number(amount) <= 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          meterId,
          amount: Number(amount),
          method,
          reference: reference.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record payment");
        return;
      }
      await Swal.fire({ title: "Recorded", text: "Payment recorded successfully.", icon: "success", timer: 2000, showConfirmButton: false });
      setAmount("");
      setReference("");
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
        title="Record payment"
        description="Record a customer payment for one of your assigned meters."
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
              <Label>Amount (USD) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Method</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ref"
              />
            </div>
            <Button type="submit" disabled={submitting || !meterId || !amount}>{submitting ? "Recording…" : "Record payment"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
