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

export default function SetupPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [zoneForm, setZoneForm] = useState({ name: "", description: "", subSectionId: "" });
  const [sectionForm, setSectionForm] = useState({ name: "", description: "" });
  const [subSectionForm, setSubSectionForm] = useState({ name: "", description: "", sectionId: "" });

  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [subSectionSubmitting, setSubSectionSubmitting] = useState(false);

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
    ])
      .then(([z, s, ss]) => {
        if (z?.error) setError(z.error);
        else setZones(Array.isArray(z) ? z : []);
        if (s?.error) setError(s.error);
        else setSections(Array.isArray(s) ? s : []);
        if (ss?.error) setError(ss.error);
        else setSubSections(Array.isArray(ss) ? ss : []);
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
        description="Create zones, sections, and sub-sections. Use them when adding meters."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      <p className="mb-4 text-sm text-slate-500">Order: Section → Sub-section → Zone. Create sections first, then sub-sections under a section, then zones under a sub-section.</p>

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
    </div>
  );
}
