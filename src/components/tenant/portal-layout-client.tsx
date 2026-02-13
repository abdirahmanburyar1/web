"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { TenantSidebar } from "./sidebar";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function TenantPortalLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || isLogin) return;
    const token = getToken();
    if (!token) router.replace("/login");
  }, [mounted, isLogin, router]);

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TenantSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
          <span className="text-sm font-medium text-slate-500 lg:ml-0">Tenant Portal</span>
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
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
