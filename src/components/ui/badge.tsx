"use client";

const styles: Record<string, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-cyan-100 text-cyan-800",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof styles }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant] ?? styles.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
