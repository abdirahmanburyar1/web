import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAIN_HOST = "aquatrack.so";
const TENANT_PORTAL_PATHS = [
  "/login",
  "/dashboard",
  "/customers",
  "/invoices",
  "/payments",
  "/meter-readings",
  "/reports",
  "/users",
  "/settings",
];

function isTenantPortalPath(pathname: string) {
  return TENANT_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const url = request.nextUrl.clone();

  // Dev: allow ?tenant=slug to simulate subdomain
  const devTenant = url.searchParams.get("tenant");
  if (devTenant && (hostname === "localhost" || hostname === "127.0.0.1")) {
    const res = NextResponse.next();
    res.headers.set("x-tenant-slug", devTenant);
    res.cookies.set("tenant_slug", devTenant, { path: "/", maxAge: 60 * 60 * 24 });
    return res;
  }

  // Tenant subdomain: acme.aquatrack.so → slug = acme (tenant_id comes from session/JWT)
  const parts = hostname.split(".");
  const isSubdomain =
    parts.length >= 2 &&
    (hostname.endsWith(MAIN_HOST) || hostname.endsWith(`.${MAIN_HOST}`));
  const reservedSubdomains = ["www", "admin", "platform", "api", "app"];
  const slug =
    isSubdomain && !reservedSubdomains.includes(parts[0])
      ? parts[0]
      : null;

  if (slug) {
    const res = NextResponse.next();
    res.headers.set("x-tenant-slug", slug);
    res.cookies.set("tenant_slug", slug, { path: "/", maxAge: 60 * 60 * 24 });
    return res;
  }

  // Legacy /tenant/* → clean paths (subdomain + tenant_id in session; no /tenant in URL)
  if (url.pathname.startsWith("/tenant/")) {
    const rest = url.pathname.slice("/tenant".length) || "/dashboard";
    url.pathname = rest === "/login" ? "/login" : rest;
    return NextResponse.redirect(url);
  }

  // Main domain: if user requested a tenant portal path, send to tenant entry
  if (hostname === MAIN_HOST && isTenantPortalPath(url.pathname)) {
    url.pathname = "/enter";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Main domain: clear tenant_slug cookie so tenant is only set on subdomain (or dev ?tenant=)
  if (hostname === MAIN_HOST) {
    const res = NextResponse.next();
    res.cookies.delete("tenant_slug");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
