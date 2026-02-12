"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PlatformSidebar } from "./sidebar";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function PlatformLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || isLogin) return;
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    // Tenant users (session with tenantId) must not use platform on root domain
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((user) => {
        if (user?.tenantId) {
          const slug = user?.tenant?.slug;
          if (slug && typeof window !== "undefined") {
            const origin = window.location.origin;
            if (origin.includes("aquatrack.so")) {
              window.location.replace(`https://${slug}.aquatrack.so${window.location.pathname}`);
              return;
            }
          }
          router.replace("/enter");
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
  }, [mounted, isLogin, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  if (isLogin) return <>{children}</>;
  if (!getToken()) return null;
  if (!sessionChecked && !isLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <span className="text-sm text-slate-500">Platform</span>
          <Link
            href="/login"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("portal");
            }}
            className="text-sm text-slate-600 hover:text-cyan-700"
          >
            Sign out
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
