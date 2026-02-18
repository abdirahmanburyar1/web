"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  price: { id: string; name: string; pricePerCubic: number | string } | null;
  collector: { id: string; fullName: string } | null;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function CollectorHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [meter, setMeter] = useState<Meter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      setSearched(true);
      return;
    }
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setMeter(null);
    setSearched(true);
    fetch(`/api/tenant/collector/my-meters?search=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMeter(null);
          return;
        }
        const m = Array.isArray(d.meters) && d.meters.length > 0 ? d.meters[0] : null;
        setMeter(m);
      })
      .catch(() => setMeter(null))
      .finally(() => setLoading(false));
  }

  const statusVariant = (s: string) =>
    s === "ACTIVE" ? "success" : s === "OVERDUE" || s === "SUSPENDED" ? "warning" : "default";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Collector</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search by meter number or plate number
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Meter # or plate..."
            className="flex-1"
            autoFocus
          />
          <Button
            type="submit"
            disabled={loading || !search.trim()}
          >
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
        {search.trim() === "" && searched && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Enter a meter number or plate number to search.
          </p>
        )}
      </form>

      {searched && !loading && search.trim() !== "" && (
        <>
          {meter ? (
            <Card className="overflow-hidden border-slate-200 shadow-md dark:border-slate-700">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 dark:border-slate-700 dark:bg-slate-800/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Meter
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                      {meter.meterNumber}
                    </p>
                  </div>
                  <Badge variant={statusVariant(meter.status)}>{meter.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Customer</p>
                  <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                    {meter.customerName}
                  </p>
                </div>
                {(meter.customerPhone || meter.residentPhone) && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Phones</p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {[meter.customerPhone, meter.residentPhone].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                )}
                {(meter.section || meter.subSection || meter.zone?.name) && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Section / Zone
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {[meter.section, meter.subSection, meter.zone?.name].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                )}
                {meter.address && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Address</p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{meter.address}</p>
                  </div>
                )}
                {meter.price && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Price</p>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {meter.price.name} — ${Number(meter.price.pricePerCubic).toFixed(4)}/m³
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href={`/collector/record-reading?meterId=${meter.id}`} className="inline-block">
                    <Button className="w-full sm:w-auto">Record reading</Button>
                  </Link>
                  <Link href={`/collector/record-payment?meterId=${meter.id}`} className="inline-block">
                    <Button variant="secondary" className="w-full sm:w-auto">
                      Record payment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
              <CardContent className="py-6 text-center">
                <p className="font-medium text-amber-800 dark:text-amber-200">No meter found</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  No meter with that number is assigned to you. Check the number or open My meters.
                </p>
                <Link href="/collector/meters" className="mt-4 inline-block">
                  <Button variant="secondary">My meters</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="mt-8 flex justify-center">
        <Link href="/collector/meters">
          <Button variant="ghost" size="sm">My meters</Button>
        </Link>
      </div>
    </div>
  );
}
