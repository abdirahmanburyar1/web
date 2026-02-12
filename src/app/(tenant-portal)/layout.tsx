import { TenantPortalLayoutClient } from "@/components/tenant/portal-layout-client";

export default function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantPortalLayoutClient>{children}</TenantPortalLayoutClient>;
}
