"use client";

const variants = {
  primary:
    "bg-teal-600 text-white shadow-sm hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 focus:ring-2 focus:ring-slate-300 disabled:opacity-50",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50",
  platform:
    "bg-cyan-600 text-white shadow-sm hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "px-3 py-1.5 text-sm rounded-lg" : size === "lg" ? "px-6 py-3 text-base rounded-xl" : "px-4 py-2.5 text-sm font-medium rounded-xl";
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors ${sizeClass} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
