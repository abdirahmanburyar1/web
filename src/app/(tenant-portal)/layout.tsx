import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TenantPortalLayoutClient } from "@/components/tenant/portal-layout-client";
import { UnregisteredSubdomainContact } from "@/components/tenant/unregistered-subdomain-contact";

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");
  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return <UnregisteredSubdomainContact />;
  }
  return <TenantPortalLayoutClient>{children}</TenantPortalLayoutClient>;
}
