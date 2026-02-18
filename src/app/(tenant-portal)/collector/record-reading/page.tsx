"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { ReadingSlipThermal } from "@/components/collector/reading-slip-thermal";
import Swal from "sweetalert2";

type Meter = { id: string; meterNumber: string; customerName: string };

type CurrentMonthReading = {
  existing: boolean;
  reading?: { id: string; value: number; unit: string; recordedAt: string };
};

type SuccessReading = {
  id: string;
  value: number | string;
  unit: string | null;
  recordedAt: string;
  meter: { id: string; meterNumber: string; customerName: string };
};

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
  const [currentMonth, setCurrentMonth] = useState<CurrentMonthReading | null>(null);
  const [lastRecorded, setLastRecorded] = useState<SuccessReading | null>(null);
  const [lastPricePerCubic, setLastPricePerCubic] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    if (!meterId || !getToken()) {
      setCurrentMonth(null);
      return;
    }
    fetch(
      `/api/tenant/meter-readings/current-month?meterId=${encodeURIComponent(meterId)}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.existing === true && d.reading) {
          setCurrentMonth({ existing: true, reading: d.reading });
        } else {
          setCurrentMonth({ existing: false });
        }
      })
      .catch(() => setCurrentMonth(null));
  }, [meterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !meterId || value === "" || Number(value) < 0) return;
    setSubmitting(true);
    setError("");
    setLastRecorded(null);
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
        if (data.alreadyGeneratedCurrentMonth && data.existingReading) {
          const r = data.existingReading;
          await Swal.fire({
            title: "Already recorded this month",
            html: `This meter already has a reading for the current month:<br/><strong>${Number(r.value).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${r.unit}</strong><br/>Recorded: ${new Date(r.recordedAt).toLocaleString()}`,
            icon: "info",
          });
        } else {
          setError(data.error || "Failed to record reading");
        }
        return;
      }
      setLastRecorded(data.reading);
      setLastPricePerCubic(data.pricePerCubic);
      await Swal.fire({
        title: "Recorded",
        text: "Meter reading recorded successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      setValue("");
      setCurrentMonth({ existing: true, reading: { id: data.reading.id, value: Number(data.reading.value), unit: data.reading.unit ?? "m³", recordedAt: data.reading.recordedAt } });
    } finally {
      setSubmitting(false);
    }
  }

  function printSlip() {
    window.print();
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (error && meters.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <Link href="/collector" className="mt-4 inline-block text-teal-600 hover:underline dark:text-teal-400">
          Back to collector
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Record reading"
        description="Submit a meter reading for one of your assigned meters."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {error}
        </div>
      )}
      {currentMonth?.existing && currentMonth.reading && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200">
          <strong>Current month already recorded:</strong>{" "}
          {Number(currentMonth.reading.value).toLocaleString(undefined, { maximumFractionDigits: 4 })} {currentMonth.reading.unit} on{" "}
          {new Date(currentMonth.reading.recordedAt).toLocaleString()}. You can still submit again (e.g. transfer); otherwise choose another meter.
        </div>
      )}
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Meter *</Label>
              <select
                value={meterId}
                onChange={(e) => setMeterId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                required
              >
                <option value="">— Select meter —</option>
                {meters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meterNumber} — {m.customerName}
                  </option>
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="m³">m³</option>
                <option value="L">L</option>
                <option value="gal">gal</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting || !meterId || value === ""}>
              {submitting ? "Recording…" : "Record reading"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastRecorded && (
        <Card className="mt-6 max-w-md">
          <CardHeader className="pb-2 no-print-reading-slip print:!hidden">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Print slip (P58E thermal)</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadingSlipThermal
              meterNumber={lastRecorded.meter.meterNumber}
              customerName={lastRecorded.meter.customerName}
              value={lastRecorded.value}
              unit={lastRecorded.unit ?? "m³"}
              recordedAt={lastRecorded.recordedAt}
              pricePerCubic={lastPricePerCubic}
            />
            <Button type="button" variant="secondary" onClick={printSlip} className="no-print-reading-slip print:!hidden">
              Print slip
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
