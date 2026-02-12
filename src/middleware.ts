import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAIN_HOST = "aquatrack.so";

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

  // Legacy /tenant/* → clean paths on subdomain
  if (url.pathname.startsWith("/tenant/")) {
    const rest = url.pathname.slice("/tenant".length) || "/dashboard";
    url.pathname = rest === "/login" ? "/login" : rest;
    return NextResponse.redirect(url);
  }

  // Legacy /platform/* → clean URLs (root domain is platform by default)
  if (url.pathname.startsWith("/platform/")) {
    url.pathname = url.pathname.replace(/^\/platform/, "") || "/dashboard";
    return NextResponse.redirect(url);
  }

  const isMainDomain =
    hostname === MAIN_HOST ||
    hostname === `www.${MAIN_HOST}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  // Root domain (and localhost without ?tenant=): platform portal at clean URLs
  if (isMainDomain && !slug) {
    if (url.pathname === "/") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const platformPaths = ["/login", "/dashboard", "/tenants", "/plans", "/settings", "/reports"];
    if (platformPaths.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
      const rewrite = NextResponse.rewrite(new URL(`/platform${url.pathname}`, request.url));
      rewrite.cookies.delete("tenant_slug");
      return rewrite;
    }
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
