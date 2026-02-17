"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "OVERDUE", "INACTIVE"] as const;

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
  price?: { id: string; name: string; pricePerCubic: number | string } | null;
};

export default function MeterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [meter, setMeter] = useState<Meter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId?: string | null }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [prices, setPrices] = useState<Array<{ id: string; name: string; pricePerCubic: number }>>([]);
  const [form, setForm] = useState({
    meterNumber: "",
    customerName: "",
    customerPhone: "",
    residentPhone: "",
    section: "",
    subSection: "",
    zoneId: "",
    plateNumber: "",
    status: "PENDING",
    address: "",
    meterType: "",
    meterModel: "",
    installationDate: "",
    serialNumber: "",
    collectorId: "",
    priceId: "",
  });

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function loadOptions() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/zones", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((z) => { if (!z?.error) setZones(Array.isArray(z) ? z : []); }).catch(() => {});
    fetch("/api/tenant/sections", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((s) => { if (!s?.error) setSections(Array.isArray(s) ? s : []); }).catch(() => {});
    fetch("/api/tenant/sub-sections", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((ss) => { if (!ss?.error) setSubSections(Array.isArray(ss) ? ss : []); }).catch(() => {});
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((u) => setUsers(u?.users ?? [])).catch(() => {});
    fetch("/api/tenant/prices", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()).then((p) => { if (!p?.error) setPrices(Array.isArray(p) ? p : []); }).catch(() => {});
  }

  useEffect(() => {
    const t = getToken();
    if (!t || !id) {
      setLoading(false);
      return;
    }
    loadOptions();
    fetch(`/api/tenant/meters/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((meterData) => {
        if (meterData.error || !meterData.id) {
          setError(meterData.error || "Meter not found");
          return;
        }
        setMeter(meterData);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing() {
    if (!meter) return;
    setForm({
      meterNumber: meter.meterNumber,
      customerName: meter.customerName,
      customerPhone: meter.customerPhone ?? "",
      residentPhone: meter.residentPhone ?? "",
      section: meter.section ?? "",
      subSection: meter.subSection ?? "",
      zoneId: meter.zone?.id ?? "",
      plateNumber: meter.plateNumber ?? "",
      status: meter.status,
      address: meter.address ?? "",
      meterType: meter.meterType ?? "",
      meterModel: meter.meterModel ?? "",
      installationDate: meter.installationDate ? new Date(meter.installationDate).toISOString().slice(0, 10) : "",
      serialNumber: meter.serialNumber ?? "",
      collectorId: meter.collector?.id ?? "",
      priceId: meter.price?.id ?? "",
    });
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant/meters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          meterNumber: form.meterNumber.trim(),
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim() || null,
          residentPhone: form.residentPhone.trim() || null,
          section: form.section.trim() || null,
          subSection: form.subSection.trim() || null,
          zoneId: form.zoneId || null,
          plateNumber: form.plateNumber.trim() || null,
          status: form.status,
          address: form.address.trim() || null,
          meterType: form.meterType.trim() || null,
          meterModel: form.meterModel.trim() || null,
          installationDate: form.installationDate ? form.installationDate : null,
          serialNumber: form.serialNumber.trim() || null,
          collectorId: form.collectorId || null,
          priceId: form.priceId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to update");
        return;
      }
      setMeter(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

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
        action={!editing ? <Button variant="secondary" onClick={startEditing}>Edit meter</Button> : null}
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="font-semibold text-slate-900">
            {editing ? "Edit meter details" : "Meter details"}
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Meter number *</Label>
                    <Input value={form.meterNumber} onChange={(e) => setForm((f) => ({ ...f, meterNumber: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Customer name *</Label>
                    <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Customer phone</Label>
                    <Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Resident phone</Label>
                    <Input value={form.residentPhone} onChange={(e) => setForm((f) => ({ ...f, residentPhone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Input value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} placeholder="e.g. Block A" />
                  </div>
                  <div>
                    <Label>Sub-section</Label>
                    <Input value={form.subSection} onChange={(e) => setForm((f) => ({ ...f, subSection: e.target.value }))} placeholder="e.g. Unit 1" />
                  </div>
                  <div>
                    <Label>Zone</Label>
                    <select value={form.zoneId} onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">— None —</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Plate number</Label>
                    <Input value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Meter type</Label>
                    <Input value={form.meterType} onChange={(e) => setForm((f) => ({ ...f, meterType: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Meter model</Label>
                    <Input value={form.meterModel} onChange={(e) => setForm((f) => ({ ...f, meterModel: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Installation date</Label>
                    <Input type="date" value={form.installationDate} onChange={(e) => setForm((f) => ({ ...f, installationDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Serial number</Label>
                    <Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Collector</Label>
                    <select value={form.collectorId} onChange={(e) => setForm((f) => ({ ...f, collectorId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">— None —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Price (tariff)</Label>
                    <select value={form.priceId} onChange={(e) => setForm((f) => ({ ...f, priceId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">— Default —</option>
                      {prices.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({Number(p.pricePerCubic).toFixed(4)}/m³)</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
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
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Price (tariff)</dt>
                  <dd className="mt-0.5 text-sm text-slate-600">{meter.price ? `${meter.price.name} (${Number(meter.price.pricePerCubic).toFixed(4)}/m³)` : "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
