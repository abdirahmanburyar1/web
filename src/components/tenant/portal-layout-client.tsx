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

  const isLogin = pathname === "/login";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLogin) return;
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [mounted, isLogin, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  const token = getToken();
  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TenantSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <div className="text-sm text-slate-500">
            Tenant Portal
          </div>
          <Link
            href="/login"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("portal");
            }}
            className="text-sm text-slate-600 hover:text-teal-700"
          >
            Sign out
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
