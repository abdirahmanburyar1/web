"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const links = [
  {
    href: "/users",
    title: "Users",
    description: "Manage your team: add staff, collectors, and accountants. Assign roles and permissions.",
    icon: "👤",
  },
  {
    href: "/roles",
    title: "Roles & permissions",
    description: "Define roles and assign permissions. Control who can view or edit meters, record readings, and manage payments.",
    icon: "🔐",
  },
  {
    href: "/setup",
    title: "Setup & prices",
    description: "Create sections, sub-sections, and zones. Define water prices (tariff per m³) and set a default for new meters.",
    icon: "💰",
  },
  {
    href: "/settings/money-accounts",
    title: "Money accounts",
    description: "Bank accounts, mobile money numbers, and payment details. These appear on printed receipts so customers know where to pay.",
    icon: "🏦",
  },
];

export default function SettingsPage() {
  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  if (!getToken()) {
    return (
      <div>
        <p className="text-red-600">Unauthorized</p>
        <Link href="/login" className="mt-4 inline-block text-teal-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your organization: users, roles, permissions, and water prices. You have full control over who can do what and how much you charge per m³."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md hover:border-teal-200/80">
              <CardContent className="p-6">
                <span className="text-3xl opacity-90" aria-hidden>{item.icon}</span>
                <h2 className="mt-4 font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700">
                  Open →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Need to change billing cycle or payment methods? Contact your platform administrator.
      </p>
    </div>
  );
}
