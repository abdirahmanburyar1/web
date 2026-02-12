"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLATFORM_HOSTS = ["aquatrack.so", "www.aquatrack.so"];

/** Get current tenant slug from subdomain (or dev ?tenant= / cookie). */
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
      // Tenant is from session only; user must be on their company's subdomain
      if (currentSlug && data.user?.tenantSlug && data.user.tenantSlug !== currentSlug) {
        setError(`This account is for ${data.user.tenantSlug}.aquatrack.so. Go to your company's portal to sign in.`);
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("portal", "tenant");
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/" className="font-semibold text-cyan-800">AquaTrack</Link>
          <span className="ml-4 text-slate-500">Company sign in</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Company sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your company’s subdomain (e.g. acme.aquatrack.so). Platform admins: <Link href="/login" className="text-cyan-600 hover:underline">Platform Admin Portal</Link>.
          </p>
          {isPlatformDomain && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              You’re on the platform domain. This form is for <strong>company users</strong>. Platform admins should see “Platform Admin Portal” here—if you don’t, do a hard refresh (Ctrl+Shift+R) or clear cache and redeploy.
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="text-cyan-600 hover:underline">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
