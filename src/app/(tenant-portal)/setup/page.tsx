"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";

type Section = { id: string; name: string; description?: string | null; _count?: { subSections: number } };
type SubSection = {
  id: string;
  name: string;
  description?: string | null;
  sectionId?: string | null;
  section?: { id: string; name: string } | null;
  _count?: { zones: number };
};
type Zone = {
  id: string;
  name: string;
  description?: string | null;
  subSectionId?: string | null;
  subSection?: { id: string; name: string } | null;
  _count?: { meters: number };
};

export default function SetupPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedSubSectionId, setSelectedSubSectionId] = useState<string | null>(null);

  const [sectionForm, setSectionForm] = useState({ name: "", description: "" });
  const [subSectionForm, setSubSectionForm] = useState({ name: "", description: "" });
  const [zoneForm, setZoneForm] = useState({ name: "", description: "" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [subSectionSubmitting, setSubSectionSubmitting] = useState(false);
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  function loadSections() {
    const t = getToken();
    if (!t) return;
    fetch("/api/tenant/sections", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setSections(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load sections"));
  }

  function loadSubSections(sectionId: string | null) {
    const t = getToken();
    if (!t) return;
    const url = sectionId ? `/api/tenant/sub-sections?sectionId=${encodeURIComponent(sectionId)}` : "/api/tenant/sub-sections";
    fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setSubSections(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load sub-sections"));
  }

  function loadZones(subSectionId: string | null) {
    const t = getToken();
    if (!t) return;
    const url = subSectionId ? `/api/tenant/zones?subSectionId=${encodeURIComponent(subSectionId)}` : "/api/tenant/zones";
    fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setZones(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load zones"));
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    loadSections();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    setSelectedSubSectionId(null);
    if (selectedSectionId) {
      loadSubSections(selectedSectionId);
    } else {
      setSubSections([]);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (!getToken()) return;
    if (selectedSubSectionId) {
      loadZones(selectedSubSectionId);
    } else {
      setZones([]);
    }
  }, [selectedSubSectionId]);

  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setSectionSubmitting(true);
    setError("");
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
      setSections((prev) => [...prev, { ...data, _count: { subSections: 0 } }]);
      setSectionForm({ name: "", description: "" });
    } finally {
      setSectionSubmitting(false);
    }
  }

  async function createSubSection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSectionId) {
      setError("Select a section first");
      return;
    }
    const t = getToken();
    if (!t) return;
    setSubSectionSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/sub-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: subSectionForm.name.trim(),
          description: subSectionForm.description.trim() || undefined,
          sectionId: selectedSectionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create sub-section");
        return;
      }
      setSubSections((prev) => [...prev, { ...data, section: sections.find((s) => s.id === selectedSectionId) ? { id: selectedSectionId, name: sections.find((s) => s.id === selectedSectionId)!.name } : null, _count: { zones: 0 } }]);
      setSubSectionForm({ name: "", description: "" });
      loadSubSections(selectedSectionId);
    } finally {
      setSubSectionSubmitting(false);
    }
  }

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubSectionId) {
      setError("Select a sub-section first");
      return;
    }
    const t = getToken();
    if (!t) return;
    setZoneSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tenant/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: zoneForm.name.trim(),
          description: zoneForm.description.trim() || undefined,
          subSectionId: selectedSubSectionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create zone");
        return;
      }
      const sub = subSections.find((s) => s.id === selectedSubSectionId);
      setZones((prev) => [...prev, { ...data, subSection: sub ? { id: sub.id, name: sub.name } : null, _count: { meters: 0 } }]);
      setZoneForm({ name: "", description: "" });
      loadZones(selectedSubSectionId);
    } finally {
      setZoneSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedSubSection = subSections.find((s) => s.id === selectedSubSectionId);

  return (
    <div>
      <PageHeader
        title="Areas & zones"
        description="Build your structure from left to right: Section → Sub-section → Zone."
      />
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* Tariff link */}
      <Link
        href="/setup/tariffs"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 dark:border-teal-800 dark:from-teal-950/40 dark:to-emerald-950/40"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Tariff rates (prices per m³)</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage residential, commercial, and other price tiers.</p>
        </div>
        <span className="text-slate-400 dark:text-slate-500">→</span>
      </Link>

      {/* Cascading columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Column 1: Sections */}
        <Card className="flex flex-col border-2 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-sm font-bold text-teal-700 dark:text-teal-300">1</span>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sections</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Top-level areas (e.g. Block A)</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-4">
            <form onSubmit={createSection} className="space-y-3">
              <div>
                <Label className="text-slate-600 dark:text-slate-400">Name</Label>
                <Input
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Block A"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-400">Description (optional)</Label>
                <Input
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={sectionSubmitting} size="sm">
                {sectionSubmitting ? "Adding…" : "Add section"}
              </Button>
            </form>
            <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">List</p>
              {sections.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No sections yet. Add one above.</p>
              ) : (
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSectionId(s.id);
                          setSelectedSubSectionId(null);
                        }}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          selectedSectionId === s.id
                            ? "bg-teal-500 text-white dark:bg-teal-600"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        {s.name}
                        {s._count != null && (
                          <span className="ml-2 text-xs opacity-80">({s._count.subSections})</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Sub-sections (dependent on Section) */}
        <Card className="flex flex-col border-2 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-sm font-bold text-teal-700 dark:text-teal-300">2</span>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sub-sections</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedSection ? `Under "${selectedSection.name}"` : "Select a section first"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-4">
            {!selectedSectionId ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">← Select a section to manage its sub-sections.</p>
              </div>
            ) : (
              <>
                <form onSubmit={createSubSection} className="space-y-3">
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400">Name</Label>
                    <Input
                      value={subSectionForm.name}
                      onChange={(e) => setSubSectionForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Unit 1"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400">Description (optional)</Label>
                    <Input
                      value={subSectionForm.description}
                      onChange={(e) => setSubSectionForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={subSectionSubmitting} size="sm">
                    {subSectionSubmitting ? "Adding…" : "Add sub-section"}
                  </Button>
                </form>
                <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">List</p>
                  {subSections.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No sub-sections yet. Add one above.</p>
                  ) : (
                    <ul className="space-y-1">
                      {subSections.map((ss) => (
                        <li key={ss.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedSubSectionId(ss.id)}
                            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                              selectedSubSectionId === ss.id
                                ? "bg-teal-500 text-white dark:bg-teal-600"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
                            }`}
                          >
                            {ss.name}
                            {ss._count != null && (
                              <span className="ml-2 text-xs opacity-80">({ss._count.zones})</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Column 3: Zones (dependent on Sub-section) */}
        <Card className="flex flex-col border-2 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-sm font-bold text-teal-700 dark:text-teal-300">3</span>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Zones</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedSubSection ? `Under "${selectedSubSection.name}"` : "Select a sub-section first"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-4">
            {!selectedSubSectionId ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">← Select a sub-section to manage its zones.</p>
              </div>
            ) : (
              <>
                <form onSubmit={createZone} className="space-y-3">
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400">Name</Label>
                    <Input
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. North"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-600 dark:text-slate-400">Description (optional)</Label>
                    <Input
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={zoneSubmitting} size="sm">
                    {zoneSubmitting ? "Adding…" : "Add zone"}
                  </Button>
                </form>
                <div className="border-t border-slate-100 dark:border-slate-700/80 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">List</p>
                  {zones.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No zones yet. Add one above.</p>
                  ) : (
                    <ul className="space-y-1">
                      {zones.map((z) => (
                        <li
                          key={z.id}
                          className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          {z.name}
                          {z._count != null && (
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{z._count.meters} meters</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
