"use client";

import Link from "next/link";

export function PageHeader({
  title,
  description,
  backLink,
  action,
}: {
  title: string;
  description?: string;
  backLink?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {backLink && (
          <Link
            href={backLink.href}
            className="mb-2 inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors"
          >
            <span className="mr-1.5">←</span>
            {backLink.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
