"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PlatformLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
      if (data.user?.tenantId) {
        setError("This account is a company user. Use your company's subdomain (e.g. acme.aquatrack.so) to sign in.");
        return;
      }
      if (data.user?.roleType !== "PLATFORM_ADMIN") {
        setError("Platform admin access only.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("portal", "platform");
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl shadow-slate-200/50">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6">
            <Link href="/" className="text-lg font-semibold text-cyan-700 hover:text-cyan-800">
              AquaTrack
            </Link>
            <p className="mt-1 text-xs text-slate-500">Platform Admin</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Admin Portal</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your platform admin account. Company users should use their subdomain (e.g. acme.aquatrack.so).
          </p>
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
                placeholder="admin@aquatrack.so"
                required
                className="focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>
            <div>
              <Label className="mb-1.5">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus:ring-cyan-500/20 focus:border-cyan-500"
              />
            </div>
            <Button type="submit" variant="platform" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-cyan-600 transition-colors">
              ← Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
