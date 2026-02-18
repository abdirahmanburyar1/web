"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDashboard,
  IconSetup,
  IconMeters,
  IconPayments,
  IconReports,
  IconUsers,
  IconRoles,
  IconSettings,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconHome,
  IconLogOut,
} from "@/components/ui/sidebar-icons";
import { useTheme } from "@/lib/theme";

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
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
          border-r border-slate-200/80 bg-white shadow-lg
          dark:border-slate-700/80 dark:bg-slate-900
          transition-[width] duration-200 ease-out
          lg:static lg:z-0 lg:shadow-none
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

        {/* Search (placeholder – navigates to dashboard for now) */}
        <div className="border-b border-slate-200/80 px-3 py-3 dark:border-slate-700/80">
          {collapsed ? (
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
              title="Search"
            >
              <IconSearch className="size-5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
              <IconSearch className="size-5 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-400 dark:text-slate-500">Search</span>
            </div>
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

        {/* Theme toggle + Sign out */}
        <div className="border-t border-slate-200/80 p-3 dark:border-slate-700/80">
          {/* Theme toggle */}
          <div className={`mb-2 flex rounded-xl bg-slate-100 dark:bg-slate-800/60 ${collapsed ? "flex-col gap-1 p-1" : "p-1"}`}>
            {collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                  title={theme === "light" ? "Switch to dark" : "Switch to light"}
                >
                  {theme === "light" ? <IconMoon className="size-5" /> : <IconSun className="size-5" />}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => theme !== "light" && toggleTheme()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                    theme === "light"
                      ? "bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <IconSun className="size-4" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => theme !== "dark" && toggleTheme()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                    theme === "dark"
                      ? "bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <IconMoon className="size-4" /> Dark
                </button>
              </>
            )}
          </div>

          {collapsed ? (
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60"
                title="Back to home"
              >
                <IconHome className="size-5" />
              </Link>
              <Link
                href="/login"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("portal");
                  onClose?.();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60"
                title="Sign out"
              >
                <IconLogOut className="size-5" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
              >
                <IconHome className="size-5" /> Back to home
              </Link>
              <Link
                href="/login"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("portal");
                  onClose?.();
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
              >
                <IconLogOut className="size-5" /> Sign out
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
