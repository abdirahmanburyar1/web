"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme";
import { PlatformSidebar } from "./sidebar";
import { AppNavbar, NavbarSignOut } from "@/components/ui/app-navbar";
import { getPlatformNavTitle } from "@/lib/nav-titles";

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
  const isLogin = pathname === "/platform/login";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || isLogin) return;
    const token = getToken();
    if (!token) {
      router.replace("/platform/login");
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
      </div>
    );
  }
  if (isLogin) return <>{children}</>;
  if (!getToken()) return null;
  if (!sessionChecked && !isLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
      </div>
    );
  }

  const navTitle = getPlatformNavTitle(pathname);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <PlatformSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppNavbar
            title={navTitle.title}
            subtitle={navTitle.subtitle}
            onMenuClick={() => setSidebarOpen(true)}
            showMenuButton={true}
            right={
              <NavbarSignOut
                href="/platform/login"
                accent="cyan"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("portal");
                }}
              />
            }
          />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
