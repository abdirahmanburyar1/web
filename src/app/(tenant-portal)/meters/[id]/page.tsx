"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Meter = {
  id: string;
  meterNumber: string;
  customerName: string;
  customerPhone: string | null;
  residentPhone: string | null;
  section: string | null;
  subSection: string | null;
  plateNumber: string | null;
  status: string;
  address: string | null;
  meterType: string | null;
  meterModel: string | null;
  installationDate: string | null;
  serialNumber: string | null;
  zone: { id: string; name: string } | null;
  collector: { id: string; fullName: string } | null;
};

type Reading = {
  id: string;
  value: number;
  unit?: string | null;
  recordedAt: string;
  recordedBy?: { fullName: string } | null;
};

export default function MeterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [meter, setMeter] = useState<Meter | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [readingsTotal, setReadingsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const t = getToken();
    if (!t || !id) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/tenant/meters/${id}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch(`/api/tenant/meter-readings?meterId=${id}&limit=500`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    ])
      .then(([meterData, readingsData]) => {
        if (meterData.error || !meterData.id) {
          setError(meterData.error || "Meter not found");
          return;
        }
        setMeter(meterData);
        setReadings(readingsData.readings ?? []);
        setReadingsTotal(readingsData.total ?? 0);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoading />;
  if (error || !meter) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error || "Meter not found"}</p>
        <Link href="/meters" className="mt-4 inline-block">
          <Button variant="secondary">Back to meters</Button>
        </Link>
      </div>
    );
  }

  const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/meters" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
          ← Meters
        </Link>
      </div>
      <PageHeader
        title={`Meter ${meter.meterNumber}`}
        description={meter.customerName}
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="font-semibold text-slate-900">Meter details</CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Meter number</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium text-slate-900">{meter.meterNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</dt>
                <dd className="mt-0.5"><Badge variant={statusVariant(meter.status)}>{meter.status}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Customer name</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{meter.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Customer phone</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.customerPhone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Resident phone</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.residentPhone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Section / Sub-section</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{[meter.section, meter.subSection].filter(Boolean).join(" / ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Zone</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.zone?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Plate number</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.plateNumber ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Address</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.address ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Meter type / model</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{[meter.meterType, meter.meterModel].filter(Boolean).join(" — ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Installation date</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.installationDate ? new Date(meter.installationDate).toLocaleDateString() : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Serial number</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.serialNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Collector</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{meter.collector?.fullName ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="font-semibold text-slate-900">Readings history</CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">All recorded readings for this meter.</p>
            {readings.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-sm text-slate-500">No readings yet</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Value</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {readings.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{Number(r.value)} {r.unit ?? "m³"}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(r.recordedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{r.recordedBy?.fullName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">Total: {readingsTotal} readings</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
