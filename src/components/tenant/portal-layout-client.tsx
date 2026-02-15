"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { TenantSidebar } from "./sidebar";
import { CollectorSidebar } from "@/components/collector/sidebar";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

type Me = { id: string; roleType: string } | null;

export function TenantPortalLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === "/login";
  const isCollectorApp = pathname.startsWith("/collector");

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
      .then((data) => {
        if (data.id && data.roleType) setMe({ id: data.id, roleType: data.roleType });
      })
      .catch(() => setMe(null));
  }, [mounted, isLogin, router]);

  useEffect(() => {
    if (!mounted || isLogin || me === null) return;
    if (me.roleType === "COLLECTOR" && (pathname === "/" || pathname === "/dashboard") && !pathname.startsWith("/collector")) {
      router.replace("/collector");
      return;
    }
    if (me.roleType !== "COLLECTOR" && pathname.startsWith("/collector")) {
      router.replace("/dashboard");
    }
  }, [mounted, isLogin, me, pathname, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;

  const token = getToken();
  if (!token) return null;

  const Sidebar = isCollectorApp ? CollectorSidebar : TenantSidebar;
  const headerLabel = isCollectorApp ? "Collector app" : "Tenant Portal";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
          <span className="text-sm font-medium text-slate-500 lg:ml-0">{headerLabel}</span>
          {!isCollectorApp && (
            <Link
              href="/login"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("portal");
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-teal-700"
            >
              Sign out
            </Link>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
