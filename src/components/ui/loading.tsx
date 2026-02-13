"use client";

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <LoadingSpinner />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
