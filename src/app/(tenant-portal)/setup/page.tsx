"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import Link from "next/link";

type Zone = { id: string; name: string; description?: string | null; subSectionId?: string | null; _count?: { meters: number }; subSection?: { id: string; name: string } | null };
type Section = { id: string; name: string; description?: string | null; _count?: { subSections: number } };
type SubSection = { id: string; name: string; description?: string | null; sectionId?: string | null; section?: { id: string; name: string } | null; _count?: { zones: number } };
type Price = { id: string; name: string; pricePerCubic: number | string; isDefault: boolean; _count?: { meters: number } };

export default function SetupPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [zoneForm, setZoneForm] = useState({ name: "", description: "", subSectionId: "" });
  const [sectionForm, setSectionForm] = useState({ name: "", description: "" });
  const [subSectionForm, setSubSectionForm] = useState({ name: "", description: "", sectionId: "" });
  const [priceForm, setPriceForm] = useState({ name: "", pricePerCubic: "", isDefault: false });

  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [subSectionSubmitting, setSubSectionSubmitting] = useState(false);
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceSettingDefault, setPriceSettingDefault] = useState<string | null>(null);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function load() {
    const t = getToken();
    if (!t) return;
    const headers = { Authorization: `Bearer ${t}` };
    Promise.all([
      fetch("/api/tenant/zones", { headers }).then((r) => r.json()),
      fetch("/api/tenant/sections", { headers }).then((r) => r.json()),
      fetch("/api/tenant/sub-sections", { headers }).then((r) => r.json()),
      fetch("/api/tenant/prices", { headers }).then((r) => r.json()),
    ])
      .then(([z, s, ss, p]) => {
        if (z?.error) setError(z.error);
        else setZones(Array.isArray(z) ? z : []);
        if (s?.error) setError(s.error);
        else setSections(Array.isArray(s) ? s : []);
        if (ss?.error) setError(ss.error);
        else setSubSections(Array.isArray(ss) ? ss : []);
        if (p?.error) setError(p.error);
        else setPrices(Array.isArray(p) ? p : []);
      })
      .catch(() => setError("Failed to load"))
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

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setZoneSubmitting(true);
    try {
      const res = await fetch("/api/tenant/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: zoneForm.name.trim(),
          description: zoneForm.description.trim() || undefined,
          subSectionId: zoneForm.subSectionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create zone");
        return;
      }
      setZones((prev) => [...prev, data]);
      setZoneForm({ name: "", description: "", subSectionId: "" });
    } finally {
      setZoneSubmitting(false);
    }
  }

  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setSectionSubmitting(true);
    try {
      const res = await fetch("/api/tenant/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: sectionForm.name.trim(), description: sectionForm.description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create section");
        return;
      }
      setSections((prev) => [...prev, data]);
      setSectionForm({ name: "", description: "" });
    } finally {
      setSectionSubmitting(false);
    }
  }

  async function createSubSection(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setSubSectionSubmitting(true);
    try {
      const res = await fetch("/api/tenant/sub-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: subSectionForm.name.trim(),
          description: subSectionForm.description.trim() || undefined,
          sectionId: subSectionForm.sectionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create sub-section");
        return;
      }
      setSubSections((prev) => [...prev, data]);
      setSubSectionForm({ name: "", description: "", sectionId: "" });
    } finally {
      setSubSectionSubmitting(false);
    }
  }

  async function createPrice(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    const priceVal = parseFloat(priceForm.pricePerCubic);
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setError("Price per m³ must be a non-negative number");
      return;
    }
    setPriceSubmitting(true);
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
        setError(data.error || "Failed to create price");
        return;
      }
      setPrices((prev) => [...prev, { ...data, _count: { meters: 0 } }]);
      setPriceForm({ name: "", pricePerCubic: "", isDefault: false });
    } finally {
      setPriceSubmitting(false);
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
      setPrices((prev) =>
        prev.map((p) => ({ ...p, isDefault: p.id === priceId }))
      );
    } finally {
      setPriceSettingDefault(null);
    }
  }

  async function deletePrice(priceId: string) {
    const t = getToken();
    if (!t) return;
    if (!confirm("Remove this price? Meters using it will need another price assigned.")) return;
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
  if (error && zones.length === 0 && sections.length === 0 && subSections.length === 0) {
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
        title="Setup"
        description="Manage structure (sections, sub-sections, zones) and tariff prices for meters."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      <p className="mb-6 text-sm text-slate-500">Order: Section → Sub-section → Zone. Create sections first, then sub-sections, then zones. Define prices so new meters can be assigned a tariff.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="font-medium text-slate-900">Sections</CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createSection} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Block A"
                  required
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={sectionSubmitting}>{sectionSubmitting ? "Creating…" : "Add section"}</Button>
            </form>
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4">
              {sections.length === 0 ? (
                <li className="text-sm text-slate-500">No sections yet.</li>
              ) : (
                sections.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    {s._count != null && <span className="text-slate-500">{s._count.subSections} sub-sections</span>}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="font-medium text-slate-900">Sub-sections</CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createSubSection} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={subSectionForm.name}
                  onChange={(e) => setSubSectionForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Unit 1"
                  required
                />
              </div>
              <div>
                <Label>Section (optional)</Label>
                <select
                  value={subSectionForm.sectionId}
                  onChange={(e) => setSubSectionForm((f) => ({ ...f, sectionId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                >
                  <option value="">— None —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={subSectionForm.description}
                  onChange={(e) => setSubSectionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={subSectionSubmitting}>{subSectionSubmitting ? "Creating…" : "Add sub-section"}</Button>
            </form>
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4">
              {subSections.length === 0 ? (
                <li className="text-sm text-slate-500">No sub-sections yet.</li>
              ) : (
                subSections.map((ss) => (
                  <li key={ss.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{ss.name}</span>
                    {ss.section && <span className="text-slate-500">({ss.section.name})</span>}
                    {ss._count != null && <span className="text-slate-500">{ss._count.zones} zones</span>}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="font-medium text-slate-900">Zones</CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createZone} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. North"
                  required
                />
              </div>
              <div>
                <Label>Sub-section (optional)</Label>
                <select
                  value={zoneForm.subSectionId}
                  onChange={(e) => setZoneForm((f) => ({ ...f, subSectionId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                >
                  <option value="">— None —</option>
                  {subSections.map((ss) => (
                    <option key={ss.id} value={ss.id}>{ss.name}{ss.section ? ` (${ss.section.name})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={zoneSubmitting}>{zoneSubmitting ? "Creating…" : "Add zone"}</Button>
            </form>
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4">
              {zones.length === 0 ? (
                <li className="text-sm text-slate-500">No zones yet.</li>
              ) : (
                zones.map((z) => (
                  <li key={z.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{z.name}</span>
                    {z.subSection && <span className="text-slate-500">({z.subSection.name})</span>}
                    {z._count != null && <span className="text-slate-500">{z._count.meters} meters</span>}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Prices — tariff rates per m³ */}
      <Card className="mt-8">
        <CardHeader className="font-medium text-slate-900">Prices (tariff rates)</CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-500">Define price tiers (e.g. Residential, Commercial). Assign a price to each meter; one price can be set as default for new meters.</p>
          <form onSubmit={createPrice} className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="min-w-[160px]">
              <Label>Name</Label>
              <Input
                value={priceForm.name}
                onChange={(e) => setPriceForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Residential"
                required
              />
            </div>
            <div className="min-w-[120px]">
              <Label>Price per m³</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={priceForm.pricePerCubic}
                onChange={(e) => setPriceForm((f) => ({ ...f, pricePerCubic: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={priceForm.isDefault}
                onChange={(e) => setPriceForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Set as default
            </label>
            <Button type="submit" disabled={priceSubmitting}>
              {priceSubmitting ? "Adding…" : "Add price"}
            </Button>
          </form>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Price per m³</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Default</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Meters</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {prices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No prices yet. Add one above.</td>
                  </tr>
                ) : (
                  prices.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-700">{Number(p.pricePerCubic).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        {p.isDefault ? (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">Default</span>
                        ) : (
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
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p._count?.meters ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        {(p._count?.meters ?? 0) === 0 && (
                          <button
                            type="button"
                            onClick={() => deletePrice(p.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
