"use client";

import Link from "next/link";

const HEADER_HEIGHT = "h-14";

/** Static app navbar: left = menu (mobile) + title, right = actions. Matches sidebar design. */
export function AppNavbar({
  title,
  subtitle,
  onMenuClick,
  showMenuButton = true,
  right,
}: {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <header
      className={`
        ${HEADER_HEIGHT}
        sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4
        border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900
        sm:px-6
      `}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showMenuButton && onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {right && (
        <div className="flex shrink-0 items-center gap-2">
          {right}
        </div>
      )}
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
