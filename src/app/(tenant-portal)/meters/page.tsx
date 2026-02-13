"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrapper } from "@/components/ui/table-responsive";
import { EmptyState } from "@/components/ui/empty";

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
};

export default function TenantMetersPage() {
  const [data, setData] = useState<{ meters: Meter[]; total: number } | null>(null);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId?: string | null }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
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
  });

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/meters?limit=100", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData({ meters: d.meters ?? [], total: d.total ?? 0 });
      })
      .catch(() => setError("Failed to load"));
    fetch("/api/tenant/zones", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((z) => setZones(Array.isArray(z) ? z : []))
      .catch(() => {});
    fetch("/api/tenant/sections", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((s) => setSections(Array.isArray(s) ? s : []))
      .catch(() => {});
    fetch("/api/tenant/sub-sections", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((ss) => setSubSections(Array.isArray(ss) ? ss : []))
      .catch(() => {});
    fetch("/api/tenant/users", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((u) => setUsers(u?.users ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    load();
    setLoading(false);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/meters", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          meterNumber: form.meterNumber.trim(),
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim() || undefined,
          residentPhone: form.residentPhone.trim() || undefined,
          section: form.section.trim() || undefined,
          subSection: form.subSection.trim() || undefined,
          zoneId: form.zoneId || undefined,
          plateNumber: form.plateNumber.trim() || undefined,
          status: form.status,
          address: form.address.trim() || undefined,
          meterType: form.meterType.trim() || undefined,
          meterModel: form.meterModel.trim() || undefined,
          installationDate: form.installationDate || undefined,
          serialNumber: form.serialNumber.trim() || undefined,
          collectorId: form.collectorId || undefined,
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        setError(out.error || "Failed to create");
        return;
      }
      setData((prev) => (prev ? { ...prev, meters: [out, ...prev.meters], total: prev.total + 1 } : { meters: [out], total: 1 }));
      setForm({ meterNumber: "", customerName: "", customerPhone: "", residentPhone: "", section: "", subSection: "", zoneId: "", plateNumber: "", status: "PENDING", address: "", meterType: "", meterModel: "", installationDate: "", serialNumber: "", collectorId: "" });
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

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

  const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default");

  return (
    <div>
      <PageHeader
        title="Meters"
        description="Meter machines and account info. One row per meter."
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => setCreateOpen((o) => !o)}>
          <span className="font-medium">{createOpen ? "−" : "+"} Add meter</span>
        </CardHeader>
        {createOpen && (
          <CardContent className="border-t border-slate-100 pt-4">
            <form onSubmit={handleCreate} className="space-y-4">
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
                  <div className="flex gap-2">
                    {sections.length > 0 && (
                      <select
                        value={sections.find((s) => s.name === form.section)?.id ?? ""}
                        onChange={(e) => {
                          const s = sections.find((x) => x.id === e.target.value);
                          setForm((f) => ({ ...f, section: s ? s.name : "" }));
                        }}
                        className="w-40 shrink-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">— Pick —</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    <Input
                      className="flex-1"
                      value={form.section}
                      onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                      placeholder="Section name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Sub-section</Label>
                  <div className="flex gap-2">
                    {subSections.length > 0 && (
                      <select
                        value={subSections.find((s) => s.name === form.subSection)?.id ?? ""}
                        onChange={(e) => {
                          const s = subSections.find((x) => x.id === e.target.value);
                          setForm((f) => ({ ...f, subSection: s ? s.name : "" }));
                        }}
                        className="w-40 shrink-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">— Pick —</option>
                        {subSections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    <Input
                      className="flex-1"
                      value={form.subSection}
                      onChange={(e) => setForm((f) => ({ ...f, subSection: e.target.value }))}
                      placeholder="Sub-section name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Zone</Label>
                  <select
                    value={form.zoneId}
                    onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  >
                    <option value="">—</option>
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
              </div>
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create meter"}</Button>
            </form>
          </CardContent>
        )}
      </Card>

      {data?.meters.length === 0 ? (
        <EmptyState title="No meters yet" description="Add your first meter above." />
      ) : (
        <TableWrapper>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Meter #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phones</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Plate</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Collector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data?.meters.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">{m.meterNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{m.customerName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{[m.customerPhone, m.residentPhone].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{(m.section || m.subSection) ? [m.section, m.subSection].filter(Boolean).join(" / ") : "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.zone?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.plateNumber ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate" title={m.address ?? ""}>{m.address ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.collector?.fullName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-500">Total: {data?.total ?? 0} meters</div>
        </TableWrapper>
      )}
    </div>
  );
}
