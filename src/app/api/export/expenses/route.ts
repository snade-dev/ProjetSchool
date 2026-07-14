import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toCsv, formatDateFr } from "@/lib/csv";
import { buildExpenseWhere } from "@/lib/queryBuilders";
import { paymentMethodLabel } from "@/lib/finance";

// Le proxy EXCLUT /api → la garde de session DANS ce handler est la SEULE
// protection (parade story-18).
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !["admin", "director", "accountant"].includes(session.user.role ?? "")) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const where = buildExpenseWhere({
    month: sp.get("month") ?? undefined,
    year: sp.get("year") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    search: sp.get("search") ?? undefined,
  });

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
    take: 10000,
  });

  const headers = [
    "Date",
    "Libellé",
    "Catégorie",
    "Fournisseur",
    "Méthode",
    "Montant",
  ];

  const rows = expenses.map((e) => [
    formatDateFr(e.date),
    e.label,
    e.category?.name ?? "",
    e.supplier ?? "",
    paymentMethodLabel(e.method),
    e.amount,
  ]);

  const csv = toCsv(headers, rows);
  const context =
    sp.get("month") && sp.get("year")
      ? `${sp.get("year")}-${String(sp.get("month")).padStart(2, "0")}`
      : sp.get("year") || "toutes";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="depenses-${context}.csv"`,
    },
  });
}
