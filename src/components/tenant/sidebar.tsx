"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconSetup,
  IconMeters,
  IconPayments,
  IconReports,
  IconUsers,
  IconRoles,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/ui/sidebar-icons";

const SIDEBAR_COLLAPSED_KEY = "aquatrack-sidebar-collapsed";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/setup", label: "Setup", icon: IconSetup },
  { href: "/meters", label: "Meters", icon: IconMeters },
  { href: "/payments", label: "Payments", icon: IconPayments },
  { href: "/reports", label: "Reports", icon: IconReports },
];

const adminNav = [
  { href: "/users", label: "Users", icon: IconUsers },
  { href: "/roles", label: "Roles", icon: IconRoles },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function TenantSidebar({
  mobileOpen,
  onClose,
  user,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  user?: { fullName?: string; roleType?: string } | null;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = useCallback(
    (v: boolean) => {
      if (typeof window !== "undefined") localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v));
      onCollapsedChange?.(v);
      setInternalCollapsed(v);
    },
    [onCollapsedChange]
  );

  useEffect(() => {
    setInternalCollapsed(getInitialCollapsed());
  }, []);

  useEffect(() => {
    if (mobileOpen && onClose) {
      const handler = () => onClose();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }
  }, [mobileOpen, onClose]);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/meters" && pathname.startsWith(href + "/") && href !== "/");

  const initials = user?.fullName
    ? user.fullName
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const roleLabel = user?.roleType?.replace(/_/g, " ") ?? "User";

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-teal-500 text-white shadow-sm dark:bg-teal-600 dark:text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white border-l-[3px] border-transparent"
    }`;

  const navItem = (item: (typeof mainNav)[0] | (typeof adminNav)[0]) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onClose}
          className={linkClass(active)}
          title={collapsed ? item.label : undefined}
        >
          <Icon />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

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
          fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col
          border-r border-slate-200 bg-white
          dark:border-slate-700 dark:bg-slate-900
          transition-[width,transform] duration-200 ease-out
          lg:static lg:z-0 lg:translate-x-0 lg:border-r lg:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-[4.5rem]" : "w-64 max-w-[85vw]"}
        `}
      >
        {/* User profile section */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 px-3 dark:border-slate-700/80">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white shadow-md dark:bg-teal-600">
              {initials}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" title="Online" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {user?.fullName ?? "User"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
            </div>
          )}
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
              aria-label="Expand sidebar"
            >
              <IconChevronRight className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
              aria-label="Collapse sidebar"
            >
              <IconChevronLeft className="size-5" />
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Main
            </p>
          )}
          <ul className="space-y-1">{mainNav.map(navItem)}</ul>

          {!collapsed && (
            <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Admin
            </p>
          )}
          <ul className="space-y-1">{adminNav.map(navItem)}</ul>
        </nav>
      </aside>
    </>
  );
}
