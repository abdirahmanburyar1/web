"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import Swal from "sweetalert2";

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "OVERDUE", "INACTIVE"] as const;

const initialForm = {
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
};

export default function NewMeterPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [subSections, setSubSections] = useState<Array<{ id: string; name: string; sectionId?: string | null }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [addNewZone, setAddNewZone] = useState(false);
  const [addNewSection, setAddNewSection] = useState(false);
  const [addNewSubSection, setAddNewSubSection] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [addingZone, setAddingZone] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [addingSubSection, setAddingSubSection] = useState(false);
  const [form, setForm] = useState(initialForm);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function loadOptions() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/zones", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((z) => { if (!z?.error) setZones(Array.isArray(z) ? z : []); })
      .catch(() => {});
    fetch("/api/tenant/sections", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((s) => { if (!s?.error) setSections(Array.isArray(s) ? s : []); })
      .catch(() => {});
    fetch("/api/tenant/sub-sections", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((ss) => { if (!ss?.error) setSubSections(Array.isArray(ss) ? ss : []); })
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
    loadOptions();
    setLoading(false);
  }, []);

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
      await Swal.fire({ title: "Created", text: "Meter created successfully.", icon: "success", timer: 2000, showConfirmButton: false });
      router.push("/meters");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !zones.length && !sections.length) {
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
      <PageHeader
        title="Add meter"
        description="Create a new meter. Required: meter number and customer name."
      />
      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <Card>
        <CardContent className="pt-6">
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
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create meter"}</Button>
              <Link href="/meters"><Button type="button" variant="secondary">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>

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
