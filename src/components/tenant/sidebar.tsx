"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/invoices", label: "Invoices", icon: "📄" },
  { href: "/payments", label: "Payments", icon: "💰" },
  { href: "/meter-readings", label: "Meter readings", icon: "🔢" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/users", label: "Users", icon: "👤" },
  { href: "/roles", label: "Roles", icon: "🔐" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function TenantSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/dashboard" className="font-semibold text-teal-800">
          AquaTrack
        </Link>
        <span className="ml-2 text-xs text-slate-400">Tenant</span>
      </div>
      <nav className="p-3 space-y-0.5 flex-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          ← Back to home
        </Link>
      </div>
    </aside>
  );
}
