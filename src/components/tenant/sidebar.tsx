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
  IconChevronDown,
  IconWallet,
  IconChart,
  IconShield,
  IconUserGroup,
  IconChat,
  IconClipboardList,
  IconBuilding,
  IconClipboard,
} from "@/components/ui/sidebar-icons";

const SIDEBAR_COLLAPSED_KEY = "aquatrack-sidebar-collapsed";
const SIDEBAR_GROUPS_KEY = "aquatrack-sidebar-groups";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// Full nav structure: Dashboard + collapsible module groups (collectors see only collector section, handled in layout)
const DASHBOARD_ITEM: NavItem = { href: "/dashboard", label: "Dashboard", icon: IconDashboard };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "operations",
    label: "Operations",
    icon: IconMeters,
    items: [
      { href: "/meters", label: "Meter Management", icon: IconMeters },
      { href: "/operations/reading-cycles", label: "Reading Cycles", icon: IconClipboard },
      { href: "/operations/reading-history", label: "Reading History", icon: IconClipboard },
      { href: "/setup", label: "Zones & Areas", icon: IconBuilding },
      { href: "/operations/bulk-import", label: "Bulk Import", icon: IconClipboard },
      { href: "/operations/audit", label: "Reading Audit", icon: IconShield },
    ],
  },
  {
    id: "billing",
    label: "Billing & Revenue",
    icon: IconPayments,
    items: [
      { href: "/invoices", label: "Invoices", icon: IconClipboard },
      { href: "/payments", label: "Payments", icon: IconPayments },
      { href: "/billing/revenue", label: "Revenue Summary", icon: IconChart },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    icon: IconWallet,
    items: [
      { href: "/financial/expenses", label: "Expenses", icon: IconWallet },
      { href: "/financial/payables", label: "Payables", icon: IconWallet },
      { href: "/financial/receivables", label: "Receivables", icon: IconWallet },
      { href: "/financial/vendors", label: "Vendors", icon: IconBuilding },
      { href: "/financial/budget", label: "Budget", icon: IconChart },
      { href: "/financial/reports", label: "P&L / Cash Flow", icon: IconChart },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: IconChat,
    items: [
      { href: "/customers/profiles", label: "Customer Profiles", icon: IconUsers },
      { href: "/customers/complaints", label: "Complaints", icon: IconChat },
      { href: "/customers/service-requests", label: "Service Requests", icon: IconClipboardList },
    ],
  },
  {
    id: "workforce",
    label: "Workforce",
    icon: IconUserGroup,
    items: [
      { href: "/workforce/collectors", label: "Collectors", icon: IconUserGroup },
      { href: "/workforce/commissions", label: "Commissions", icon: IconPayments },
      { href: "/workforce/performance", label: "Performance", icon: IconChart },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: IconChart,
    items: [
      { href: "/analytics/consumption", label: "Consumption Trends", icon: IconChart },
      { href: "/analytics/revenue", label: "Revenue Trends", icon: IconChart },
      { href: "/analytics/collector-performance", label: "Collector Metrics", icon: IconUserGroup },
      { href: "/reports", label: "Reports", icon: IconReports },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Audit",
    icon: IconShield,
    items: [
      { href: "/compliance/activity-logs", label: "Activity Logs", icon: IconClipboardList },
      { href: "/compliance/financial-audit", label: "Financial Audit", icon: IconShield },
    ],
  },
  {
    id: "config",
    label: "Configuration",
    icon: IconSetup,
    items: [
      { href: "/setup", label: "Areas & Zones", icon: IconBuilding },
      { href: "/setup/tariffs", label: "Tariff rates", icon: IconPayments },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: IconRoles,
    items: [
      { href: "/users", label: "Users", icon: IconUsers },
      { href: "/roles", label: "Roles", icon: IconRoles },
      { href: "/settings", label: "Settings", icon: IconSettings },
    ],
  },
];

// Collector nav: minimal
const COLLECTOR_NAV: NavItem[] = [
  { href: "/collector", label: "Dashboard", icon: IconDashboard },
  { href: "/collector/meters", label: "My meters", icon: IconMeters },
  { href: "/collector/record-payment", label: "Record payment", icon: IconPayments },
  { href: "/collector/record-reading", label: "Record reading", icon: IconClipboard },
];

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function getInitialOpenGroups(): Set<string> {
  if (typeof window === "undefined") return new Set(NAV_GROUPS.map((g) => g.id));
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (!raw) return new Set(NAV_GROUPS.map((g) => g.id));
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set(NAV_GROUPS.map((g) => g.id));
  }
}

function setStoredOpenGroups(open: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify([...open]));
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

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
    setOpenGroups(getInitialOpenGroups());
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setStoredOpenGroups(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (mobileOpen && onClose) {
      const handler = () => onClose();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }
  }, [mobileOpen, onClose]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

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

  const isCollector = user?.roleType === "COLLECTOR";

  const navItem = (item: NavItem) => {
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

  const renderCollectorNav = () => (
    <ul className="space-y-1">
      {COLLECTOR_NAV.map(navItem)}
    </ul>
  );

  const renderModuleNav = () => (
    <>
      {/* Dashboard at top */}
      {!collapsed && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Main
        </p>
      )}
      <ul className="space-y-1">{navItem(DASHBOARD_ITEM)}</ul>

      {/* Collapsible groups */}
      {NAV_GROUPS.map((group) => {
        const isOpen = openGroups.has(group.id);
        const GroupIcon = group.icon;
        const hasActive = group.items.some((it) => isActive(it.href));

        return (
          <div key={group.id} className="mt-4">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:hover:text-slate-300"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="size-4" />
                  {group.label}
                </span>
                <span
                  className={`shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  aria-hidden
                >
                  <IconChevronDown className="size-4" />
                </span>
              </button>
            )}
            {(!collapsed && isOpen) || collapsed ? (
              <ul className={collapsed ? "mt-1 space-y-1" : "mt-1 space-y-1 pl-1"}>
                {collapsed ? (
                  <li>
                    <Link
                      href={group.items[0].href}
                      onClick={onClose}
                      className={linkClass(hasActive)}
                      title={group.label}
                    >
                      <GroupIcon />
                    </Link>
                  </li>
                ) : (
                  group.items.map(navItem)
                )}
              </ul>
            ) : null}
          </div>
        );
      })}
    </>
  );

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
          pt-[env(safe-area-inset-top)]
          pl-[env(safe-area-inset-left)]
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-[4.5rem]" : "w-64 max-w-[min(320px,85vw)]"}
        `}
      >
        <div
          className={`flex h-14 min-h-[3.5rem] shrink-0 items-center border-b border-slate-200/80 dark:border-slate-700/80 ${
            collapsed ? "justify-center gap-1 px-1" : "justify-between gap-2 px-3"
          }`}
        >
          <div className={`flex min-w-0 items-center ${collapsed ? "flex-1 justify-center" : "flex-1 gap-3"}`}>
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white shadow-sm dark:bg-teal-600">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" title="Online" aria-hidden />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {user?.fullName ?? "User"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="flex h-10 min-h-[2.75rem] w-10 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 lg:hidden"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="hidden shrink-0 lg:block">
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-teal-400"
                  aria-label="Collapse sidebar"
                >
                  <IconChevronLeft className="size-5" />
                </button>
              </div>
            </>
          )}
          {collapsed && (
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-teal-400"
                aria-label="Expand sidebar"
              >
                <IconChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 overscroll-contain">
          {isCollector ? renderCollectorNav() : renderModuleNav()}
        </nav>
      </aside>
    </>
  );
}
