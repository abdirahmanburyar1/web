"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

type ReadingRow = {
  id: string;
  value: number | string;
  unit: string | null;
  recordedAt: string;
};

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
  const [prices, setPrices] = useState<Array<{ id: string; name: string; pricePerCubic: number; isDefault?: boolean }>>([]);
  const [addNewZone, setAddNewZone] = useState(false);
  const [addNewSection, setAddNewSection] = useState(false);
  const [addNewSubSection, setAddNewSubSection] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [addingZone, setAddingZone] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [addingSubSection, setAddingSubSection] = useState(false);
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

  function getDefaultMonthRange() {
    const now = new Date();
    const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
    return { from, to };
  }
  const defaultRange = getDefaultMonthRange();
  const [chartMonthFrom, setChartMonthFrom] = useState(defaultRange.from);
  const [chartMonthTo, setChartMonthTo] = useState(defaultRange.to);
  const [chartData, setChartData] = useState<{ month: string; value: number; label: string }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

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

  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !newZoneName.trim()) return;
    const subSectionId = form.subSection ? subSections.find((ss) => ss.name === form.subSection)?.id : undefined;
    setAddingZone(true);
    try {
      const res = await fetch("/api/tenant/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: newZoneName.trim(), subSectionId: subSectionId || undefined }),
      });
      const z = await res.json();
      if (!res.ok) {
        setError(z.error || "Failed to add zone");
        return;
      }
      setZones((prev) => [...prev, z]);
      setForm((f) => ({ ...f, zoneId: z.id }));
      setNewZoneName("");
      setAddNewZone(false);
    } finally {
      setAddingZone(false);
    }
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !newSectionName.trim()) return;
    setAddingSection(true);
    try {
      const res = await fetch("/api/tenant/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      const s = await res.json();
      if (!res.ok) {
        setError(s.error || "Failed to add section");
        return;
      }
      setSections((prev) => [...prev, s]);
      setForm((f) => ({ ...f, section: s.name }));
      setNewSectionName("");
      setAddNewSection(false);
    } finally {
      setAddingSection(false);
    }
  }

  async function handleAddSubSection(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !newSubSectionName.trim()) return;
    const sectionId = form.section ? sections.find((s) => s.name === form.section)?.id : undefined;
    setAddingSubSection(true);
    try {
      const res = await fetch("/api/tenant/sub-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: newSubSectionName.trim(), sectionId: sectionId || undefined }),
      });
      const ss = await res.json();
      if (!res.ok) {
        setError(ss.error || "Failed to add sub-section");
        return;
      }
      setSubSections((prev) => [...prev, ss]);
      setForm((f) => ({ ...f, subSection: ss.name }));
      setNewSubSectionName("");
      setAddNewSubSection(false);
    } finally {
      setAddingSubSection(false);
    }
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

  const loadChartReadings = useCallback(() => {
    const t = getToken();
    if (!t || !id || !chartMonthFrom || !chartMonthTo) return;
    const [yFrom, mFrom] = chartMonthFrom.split("-").map(Number);
    const [yTo, mTo] = chartMonthTo.split("-").map(Number);
    const fromDate = new Date(yFrom, mFrom - 1, 1);
    const toDate = new Date(yTo, mTo, 0, 23, 59, 59, 999);
    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    setChartLoading(true);
    fetch(
      `/api/tenant/meter-readings?meterId=${encodeURIComponent(id)}&from=${from}&to=${to}&limit=500`,
      { headers: { Authorization: `Bearer ${t}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const list: ReadingRow[] = data.readings ?? [];
        const byMonth: Record<string, { value: number; count: number }> = {};
        list.forEach((r) => {
          const d = new Date(r.recordedAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!byMonth[key]) byMonth[key] = { value: 0, count: 0 };
          byMonth[key].value = Number(r.value);
          byMonth[key].count += 1;
        });
        const sorted = Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, { value }]) => ({
            month,
            value,
            label: new Date(month + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" }),
          }));
        setChartData(sorted);
      })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [id, chartMonthFrom, chartMonthTo]);

  useEffect(() => {
    if (!id) return;
    loadChartReadings();
  }, [id, loadChartReadings]);

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

  const maxChartValue = chartData.length ? Math.max(...chartData.map((d) => d.value), 1) : 1;

  return (
    <div>
      <Link href="/meters" className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-teal-600 dark:hover:text-slate-400 dark:hover:text-teal-400">
        ← Back to meters
      </Link>

      {/* Hero / header block */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900/50 dark:to-slate-800/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Meter {meter.meterNumber}
              </h1>
              <Badge variant={statusVariant(meter.status)}>{meter.status}</Badge>
            </div>
            <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{meter.customerName}</p>
            {(meter.zone?.name || meter.section || meter.address) && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {[meter.zone?.name, meter.section, meter.address].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {!editing && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/meters/${id}/readings`}>
                <Button variant="secondary" size="sm">Meter readings</Button>
              </Link>
              <Button variant="secondary" onClick={startEditing}>Edit meter</Button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="font-semibold text-slate-900">
            {editing ? "Edit meter details" : "Meter details"}
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <select
                      value={addNewSection ? "__add_new__" : (sections.find((s) => s.name === form.section)?.id ?? "")}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setAddNewSection(true);
                          setForm((f) => ({ ...f, section: "" }));
                        } else {
                          setAddNewSection(false);
                          const s = sections.find((x) => x.id === e.target.value);
                          setForm((f) => ({ ...f, section: s ? s.name : "" }));
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">— Pick —</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="__add_new__">+ Add New</option>
                    </select>
                  </div>
                  <div>
                    <Label>Sub-section</Label>
                    <select
                      value={addNewSubSection ? "__add_new__" : (subSections.find((s) => s.name === form.subSection)?.id ?? "")}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setAddNewSubSection(true);
                          setForm((f) => ({ ...f, subSection: "" }));
                        } else {
                          setAddNewSubSection(false);
                          const s = subSections.find((x) => x.id === e.target.value);
                          setForm((f) => ({ ...f, subSection: s ? s.name : "" }));
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">— Pick —</option>
                      {subSections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="__add_new__">+ Add New</option>
                    </select>
                  </div>
                  <div>
                    <Label>Zone</Label>
                    <select
                      value={addNewZone ? "__add_new__" : form.zoneId}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setAddNewZone(true);
                          setForm((f) => ({ ...f, zoneId: "" }));
                        } else {
                          setAddNewZone(false);
                          setForm((f) => ({ ...f, zoneId: e.target.value }));
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">—</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                      <option value="__add_new__">+ Add New</option>
                    </select>
                  </div>
                  <div>
                    <Label>Plate number</Label>
                    <Input value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
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
                    <select
                      value={form.collectorId}
                      onChange={(e) => setForm((f) => ({ ...f, collectorId: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">—</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Price (per m³)</Label>
                    <select
                      value={form.priceId}
                      onChange={(e) => setForm((f) => ({ ...f, priceId: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">— Use tenant default —</option>
                      {prices.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${Number(p.pricePerCubic).toFixed(4)}/m³{p.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
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

        {/* Readings by month chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Readings by month</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                From
                <input
                  type="month"
                  value={chartMonthFrom}
                  onChange={(e) => setChartMonthFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                To
                <input
                  type="month"
                  value={chartMonthTo}
                  onChange={(e) => setChartMonthTo(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>
              <Button variant="secondary" size="sm" onClick={loadChartReadings} disabled={chartLoading}>
                {chartLoading ? "Loading…" : "Apply"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading && chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/20 dark:text-slate-400">
                No readings in this range. Try a different month range or add readings from Meter readings.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: "220px" }}>
                  {chartData.map((d) => (
                    <div key={d.month} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
                      <div className="w-full flex-1 flex flex-col justify-end">
                        <div
                          className="w-full rounded-t bg-teal-500 dark:bg-teal-600 transition hover:bg-teal-600 dark:hover:bg-teal-500"
                          style={{ height: `${Math.max(8, (d.value / maxChartValue) * 180)}px` }}
                          title={`${d.label}: ${d.value} m³`}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{d.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Reading value (m³) per month. Hover over bars for values.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {addNewZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-zone-title">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => { setAddNewZone(false); setNewZoneName(""); }} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-zone-title" className="text-lg font-semibold text-slate-900">Add new zone</h2>
            <form onSubmit={handleAddZone} className="mt-4 space-y-4">
              <div>
                <Label>Zone name</Label>
                <Input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="e.g. North" autoFocus />
              </div>
              {form.subSection && <p className="text-sm text-slate-500">Under sub-section: <span className="font-medium text-slate-700">{form.subSection}</span></p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => { setAddNewZone(false); setNewZoneName(""); }}>Cancel</Button>
                <Button type="submit" disabled={addingZone || !newZoneName.trim()}>{addingZone ? "Adding…" : "Add zone"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addNewSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-section-title">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => { setAddNewSection(false); setNewSectionName(""); }} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-section-title" className="text-lg font-semibold text-slate-900">Add new section</h2>
            <form onSubmit={handleAddSection} className="mt-4 space-y-4">
              <div>
                <Label>Section name</Label>
                <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="e.g. Block A" autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => { setAddNewSection(false); setNewSectionName(""); }}>Cancel</Button>
                <Button type="submit" disabled={addingSection || !newSectionName.trim()}>{addingSection ? "Adding…" : "Add section"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addNewSubSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-subsection-title">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => { setAddNewSubSection(false); setNewSubSectionName(""); }} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-subsection-title" className="text-lg font-semibold text-slate-900">Add new sub-section</h2>
            <form onSubmit={handleAddSubSection} className="mt-4 space-y-4">
              <div>
                <Label>Sub-section name</Label>
                <Input value={newSubSectionName} onChange={(e) => setNewSubSectionName(e.target.value)} placeholder="e.g. Unit 1" autoFocus />
              </div>
              {form.section && <p className="text-sm text-slate-500">Under section: <span className="font-medium text-slate-700">{form.section}</span></p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => { setAddNewSubSection(false); setNewSubSectionName(""); }}>Cancel</Button>
                <Button type="submit" disabled={addingSubSection || !newSubSectionName.trim()}>{addingSubSection ? "Adding…" : "Add sub-section"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
