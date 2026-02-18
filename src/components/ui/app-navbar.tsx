"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";

const HEADER_HEIGHT = "h-14";

/** User dropdown for navbar: avatar + name, dropdown with Back to home & Sign out */
export function NavbarUserDropdown({
  user,
  onSignOut,
}: {
  user: { fullName?: string } | null;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [open]);

  const initials = user?.fullName
    ? user.fullName
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:gap-3 sm:px-3 sm:py-2"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white sm:h-9 sm:w-9">
          {initials}
        </div>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 sm:block">
          {user?.fullName ?? "User"}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition sm:h-5 sm:w-5 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to home
          </Link>
          <Link
            href="/login"
            onClick={() => {
              onSignOut?.();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </Link>
        </div>
      )}
    </div>
  );
}

/** Static app navbar: left = menu (mobile) + title, right = user dropdown or custom actions. */
export function AppNavbar({
  title,
  subtitle,
  onMenuClick,
  showMenuButton = true,
  right,
  user,
  onSignOut,
}: {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  right?: React.ReactNode;
  user?: { fullName?: string } | null;
  onSignOut?: () => void;
}) {
  return (
    <header
      className={`
        ${HEADER_HEIGHT}
        sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4
        border-b border-slate-200 bg-white px-4 shadow-sm
        sm:px-6
      `}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showMenuButton && onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-slate-500 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Send / Share"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 6H9" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-semibold text-white">
            2
          </span>
        </button>
        {user != null ? (
          <NavbarUserDropdown user={user} onSignOut={onSignOut} />
        ) : (
          right
        )}
      </div>
    </header>
  );
}

/** Sign out link styled for navbar right slot */
export function NavbarSignOut({
  href,
  onClick,
  accent = "teal",
}: {
  href: string;
  onClick?: () => void;
  accent?: "teal" | "cyan";
}) {
  const hover = accent === "teal" ? "hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-slate-700 dark:hover:text-teal-300" : "hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-slate-700 dark:hover:text-cyan-300";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition
        dark:text-slate-300
        ${hover}
      `}
    >
      Sign out
    </Link>
  );
}
