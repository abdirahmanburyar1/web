"use client";

/** Wraps a table in a horizontally scrollable container for small screens. */
export function TableWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 ${className}`}>
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
