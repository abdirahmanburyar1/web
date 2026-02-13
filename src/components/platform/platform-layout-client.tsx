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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || isLogin) return;
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((user) => {
        if (user?.tenantId) {
          const slug = user?.tenant?.slug;
          if (slug && typeof window !== "undefined" && window.location.origin.includes("aquatrack.so")) {
            window.location.replace(`https://${slug}.aquatrack.so${window.location.pathname}`);
            return;
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
      </div>
    );
  }
  if (isLogin) return <>{children}</>;
  if (!getToken()) return null;
  if (!sessionChecked && !isLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PlatformSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-500 lg:ml-0">Platform Admin</span>
          <Link
            href="/login"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("portal");
            }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-cyan-700"
          >
            Sign out
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
