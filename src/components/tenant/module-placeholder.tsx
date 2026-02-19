"use client";

export function ModulePlaceholder({
  title,
  description,
  moduleName,
}: {
  title: string;
  description?: string;
  moduleName?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 py-12">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-4">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 14V7a2 2 0 012-2m0 0V5a2 2 0 012 2v6m-6 3h2" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        {moduleName && (
          <p className="mt-1 text-sm text-teal-600 dark:text-teal-400">{moduleName}</p>
        )}
        {description && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          This module is part of the AquaTrack modular expansion. Full implementation coming soon.
        </p>
      </div>
    </div>
  );
}
