import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getPlatformAdminOrNull } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const admin = await getPlatformAdminOrNull(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, meters: true, payments: true } },
    },
  });

  const fee = (t: { feePerPayment: unknown; _count: { payments: number } }) =>
    Number(t.feePerPayment ?? 0.2);
  const rows = tenants.map((t) => ({
    name: t.name,
    slug: t.slug,
    status: t.status,
    feePerPayment: Number(t.feePerPayment ?? 0.2).toFixed(4),
    users: t._count.users,
    meters: t._count.meters,
    transactions: t._count.payments,
    revenue: (t._count.payments * fee(t)).toFixed(2),
  }));

  if (format === "xlsx") {
    const headers = ["name", "slug", "status", "feePerPayment", "users", "meters", "transactions", "revenue"];
    const data = [headers, ...rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Tenants");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `platform-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ tenants: rows });
}
