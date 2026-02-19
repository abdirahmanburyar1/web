/** Page title and optional subtitle for navbar from pathname */
export function getTenantNavTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname === "/dashboard" || pathname === "/") return { title: "Dashboard", subtitle: "Tenant Portal" };
  if (pathname.startsWith("/setup/tariffs")) return { title: "Tariffs", subtitle: "Tariff rates" };
  if (pathname.startsWith("/setup")) return { title: "Setup", subtitle: "Areas & zones" };
  if (pathname.startsWith("/meters")) return { title: "Meters", subtitle: pathname === "/meters" ? "Meter list" : "Meter details" };
  if (pathname.startsWith("/operations")) return { title: "Operations", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Meter operations" };
  if (pathname.startsWith("/payments")) return { title: "Payments", subtitle: pathname === "/payments" ? "Payments & receipts" : "Payment details" };
  if (pathname.startsWith("/billing")) return { title: "Billing & Revenue", subtitle: pathname.includes("revenue") ? "Revenue summary" : "Billing" };
  if (pathname.startsWith("/invoices")) return { title: "Invoices", subtitle: "Billing" };
  if (pathname.startsWith("/financial")) return { title: "Financial", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Finance" };
  if (pathname.startsWith("/workforce")) return { title: "Workforce", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Team" };
  if (pathname.startsWith("/customers")) return { title: "Customers", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Customer management" };
  if (pathname.startsWith("/analytics")) return { title: "Analytics", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Insights" };
  if (pathname.startsWith("/compliance")) return { title: "Compliance & Audit", subtitle: pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Audit" };
  if (pathname.startsWith("/reports")) return { title: "Reports", subtitle: "Analytics & export" };
  if (pathname.startsWith("/users")) return { title: "Users", subtitle: "Team & permissions" };
  if (pathname.startsWith("/roles")) return { title: "Roles", subtitle: "Permissions" };
  if (pathname.startsWith("/settings")) return { title: "Settings", subtitle: "Tenant settings" };
  if (pathname.startsWith("/collector")) return { title: "AquaTrack", subtitle: "Collector" };
  return { title: "Tenant Portal", subtitle: "" };
}

export function getPlatformNavTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname === "/platform" || pathname === "/platform/dashboard") return { title: "Dashboard", subtitle: "Platform Admin" };
  if (pathname.startsWith("/platform/tenants")) return { title: "Tenants", subtitle: pathname === "/platform/tenants" ? "All tenants" : "Tenant details" };
  if (pathname.startsWith("/platform/reports")) return { title: "Reports & revenue", subtitle: "Platform" };
  if (pathname.startsWith("/platform/settings")) return { title: "Settings", subtitle: "Platform" };
  return { title: "Platform Admin", subtitle: "" };
}
