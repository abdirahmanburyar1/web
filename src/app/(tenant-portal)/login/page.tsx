"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PLATFORM_HOSTS = ["aquatrack.so", "www.aquatrack.so"];

function getCurrentSlug(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  if (params.get("tenant")) return params.get("tenant");
  if (host === "localhost" || host === "127.0.0.1") {
    const match = document.cookie.match(/tenant_slug=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  const parts = host.split(".");
  if (parts.length >= 2 && (host.endsWith("aquatrack.so") || host.endsWith(".aquatrack.so"))) {
    const reserved = ["www", "admin", "platform", "api", "app"];
    if (!reserved.includes(parts[0])) return parts[0];
  }
  return null;
}

export default function TenantLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPlatformDomain, setIsPlatformDomain] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    setIsPlatformDomain(PLATFORM_HOSTS.includes(host));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const currentSlug = getCurrentSlug();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (!data.user?.tenantId) {
        setError("This account is not a company user. Use the Platform Admin portal for platform access.");
        return;
      }
      if (currentSlug && data.user?.tenantSlug && data.user.tenantSlug !== currentSlug) {
        setError(`This account is for ${data.user.tenantSlug}.aquatrack.so. Go to your company's portal to sign in.`);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("portal", "tenant");
      }
      router.push(data.user?.roleType === "COLLECTOR" ? "/collector" : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/30 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl shadow-slate-200/50">
        <CardContent className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
          {isPlatformDomain && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You're on the platform domain. This form is for company users.{" "}
              <Link href="/login" className="font-medium text-amber-800 underline">Platform Admin Portal</Link>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <Label className="mb-1.5">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <Label className="mb-1.5">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-teal-600 transition-colors">
              ← Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
