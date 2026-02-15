"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/setup", label: "Setup", icon: "🗺️" },
  { href: "/meters", label: "Meters", icon: "🔢" },
  { href: "/payments", label: "Payments", icon: "💰" },
  { href: "/reports", label: "Reports", icon: "📈" },
];

const adminNav = [
  { href: "/users", label: "Users", icon: "👤" },
  { href: "/roles", label: "Roles", icon: "🔐" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function TenantSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (mobileOpen && onClose) {
      const handler = () => onClose();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }
  }, [mobileOpen, onClose]);

  const isActive = (href: string) => pathname === href || (href !== "/meters" && pathname.startsWith(href + "/") && href !== "/");

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-teal-500/12 text-teal-800 shadow-sm border-l-[3px] border-teal-500"
        : "text-slate-600 hover:bg-white/60 hover:text-slate-900 border-l-[3px] border-transparent"
    }`;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col
          bg-gradient-to-b from-slate-50 to-slate-100/80
          border-r border-slate-200/80 shadow-lg
          transition-transform duration-200 ease-out
          lg:static lg:z-0 lg:translate-x-0 lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5 bg-white/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white font-bold text-sm shadow-md">
            A
          </div>
          <div>
            <Link href="/dashboard" className="font-semibold text-slate-800 hover:text-teal-700 transition-colors" onClick={onClose}>
              AquaTrack
            </Link>
            <span className="ml-2 hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:inline">Tenant</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main</p>
            <ul className="space-y-1">
              {mainNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={linkClass(active)}
                    >
                      <span className="text-lg opacity-90" aria-hidden>{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin</p>
            <ul className="space-y-1">
              {adminNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={linkClass(active)}
                    >
                      <span className="text-lg opacity-90" aria-hidden>{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="border-t border-slate-200/80 p-4 bg-white/30 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/70 hover:text-slate-700 transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            href="/login"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("portal");
              if (onClose) onClose();
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/70 hover:text-slate-700 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </aside>
    </>
  );
}
