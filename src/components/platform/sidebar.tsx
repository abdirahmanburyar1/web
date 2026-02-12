"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tenants", label: "Tenants", icon: "🏢" },
  { href: "/plans", label: "Subscription plans", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/reports", label: "Reports", icon: "📈" },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/dashboard" className="font-semibold text-cyan-800">
          AquaTrack
        </Link>
        <span className="ml-2 text-xs text-slate-400">Platform</span>
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
                  ? "bg-cyan-50 text-cyan-800"
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
          ← Home
        </Link>
      </div>
    </aside>
  );
}
