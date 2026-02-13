"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/meters", label: "Meters", icon: "🔢" },
  { href: "/invoices", label: "Invoices", icon: "📄" },
  { href: "/payments", label: "Payments", icon: "💰" },
  { href: "/meter-readings", label: "Meter readings", icon: "🔢" },
  { href: "/reports", label: "Reports", icon: "📈" },
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

  const content = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 sm:justify-start">
        <Link href="/dashboard" className="font-semibold text-teal-800" onClick={onClose}>
          AquaTrack
        </Link>
        <span className="ml-2 hidden text-xs text-slate-400 sm:inline">Tenant</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-lg" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3 space-y-0.5">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700"
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
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          Sign out
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}
      {/* Sidebar: drawer on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl
          transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {content}
      </aside>
    </>
  );
}
