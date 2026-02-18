/** Page title and optional subtitle for navbar from pathname */
export function getTenantNavTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname === "/dashboard" || pathname === "/") return { title: "Dashboard", subtitle: "Tenant Portal" };
  if (pathname.startsWith("/setup")) return { title: "Setup", subtitle: "Zones & structure" };
  if (pathname.startsWith("/meters")) return { title: "Meters", subtitle: pathname === "/meters" ? "Meter list" : "Meter details" };
  if (pathname.startsWith("/payments")) return { title: "Payments", subtitle: pathname === "/payments" ? "Payments & receipts" : "Payment details" };
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
