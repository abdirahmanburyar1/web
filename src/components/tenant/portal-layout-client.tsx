"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "@/lib/theme";
import { TenantSidebar } from "./sidebar";
import { AppNavbar } from "@/components/ui/app-navbar";
import { getTenantNavTitle } from "@/lib/nav-titles";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

type Me = { id: string; roleType: string; fullName?: string } | null;

export function TenantPortalLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = pathname === "/login";
  const isCollector = me?.roleType === "COLLECTOR";
  const isCollectorGate = pathname === "/collector";

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
        if (data.id && data.roleType) setMe({ id: data.id, roleType: data.roleType, fullName: data.fullName });
      })
      .catch(() => setMe(null));
  }, [mounted, isLogin, router]);

  // Collectors: only allow /collector (gate page). Redirect elsewhere to /collector.
  useEffect(() => {
    if (!mounted || isLogin || me === null) return;
    if (isCollector && pathname !== "/collector") {
      router.replace("/collector");
      return;
    }
    if (!isCollector && pathname === "/collector") {
      router.replace("/dashboard");
    }
  }, [mounted, isLogin, me, pathname, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;

  const token = getToken();
  if (!token) return null;

  const navTitle = getTenantNavTitle(pathname);

  // All tenant users (including collectors) see sidebar + navbar + main
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <TenantSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={me}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppNavbar
            title={navTitle.title}
            subtitle={navTitle.subtitle}
            onMenuClick={() => setSidebarOpen(true)}
            showMenuButton={true}
            user={me}
            onSignOut={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("portal");
            }}
          />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
