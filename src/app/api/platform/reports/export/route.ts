import { NextResponse } from "next/server";
import { getPlatformAdminOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";

const REVENUE_PER_TRANSACTION = 0.1;

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, customers: true, payments: true } },
    },
  });

  const rows = tenants.map((t) => ({
    name: t.name,
    slug: t.slug,
    status: t.status,
    plan: t.subscriptionPlan,
    users: t._count.users,
    customers: t._count.customers,
    transactions: t._count.payments,
    revenue: (t._count.payments * REVENUE_PER_TRANSACTION).toFixed(2),
  }));

  if (format === "csv") {
    const headers = ["name", "slug", "status", "plan", "users", "customers", "transactions", "revenue"];
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h])).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tenants-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ tenants: rows });
}
