import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toCsv, formatDateFr } from "@/lib/csv";
import { clampMonth, clampYear } from "@/lib/queryBuilders";
import { SalaryStatus } from "@/app/generated/prisma";

// Le proxy EXCLUT /api → la garde de session DANS ce handler est la SEULE
// protection (parade story-18).
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<SalaryStatus, string> = {
  PENDING: "En attente",
  PAID: "Payé",
};

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  // Mêmes clés/clamp que la page /list/payroll : mois courant si absent/invalide.
  const month = clampMonth(sp.get("month") ?? undefined);
  const year = clampYear(sp.get("year") ?? undefined);

  const rows = await prisma.salaryPayment.findMany({
    where: { month, year },
    include: { employee: true },
    orderBy: { employee: { surname: "asc" } },
    take: 10000,
  });

  const headers = [
    "Employé",
    "Poste",
    "Mois",
    "Année",
    "Base",
    "Primes",
    "Retenues",
    "Net",
    "Statut",
    "Payé le",
  ];

  const data = rows.map((r) => [
    `${r.employee.surname} ${r.employee.name}`,
    r.employee.position,
    r.month,
    r.year,
    r.baseAmount,
    r.bonuses,
    r.deductions,
    r.netAmount,
    STATUS_LABELS[r.status] ?? r.status,
    formatDateFr(r.paidAt),
  ]);

  const csv = toCsv(headers, data);
  const context = `${year}-${String(month).padStart(2, "0")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paie-${context}.csv"`,
    },
  });
}
