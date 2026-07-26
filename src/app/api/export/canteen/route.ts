import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { getCanteenRecap } from "@/lib/canteen";

/**
 * X04 — Export CSV du récapitulatif cantine d'un mois (§2.5).
 * Le proxy EXCLUT /api : la garde de session DANS ce handler est la SEULE
 * protection (convention S18/W10).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = session?.user.role ?? "";
  if (
    !session ||
    !["admin", "director", "accountant", "supervisor"].includes(role)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId =
    (session.user as { schoolId?: number | null }).schoolId ?? -1;

  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true, schoolId },
    select: { id: true },
  });
  if (!activeYear) {
    return new Response("Aucune année scolaire active", { status: 409 });
  }

  const sp = request.nextUrl.searchParams;
  const now = new Date();
  const month = sp.get("month")
    ? Math.min(12, Math.max(1, parseInt(sp.get("month")!)))
    : now.getMonth() + 1;
  const year = sp.get("year") ? parseInt(sp.get("year")!) : now.getFullYear();

  const { rows, totals } = await getCanteenRecap({
    schoolId,
    schoolYearId: activeYear.id,
    year,
    month,
  });

  const headers = [
    "Élève",
    "Matricule",
    "Classe",
    "Formule",
    "Repas forfait",
    "Repas à l'unité",
    "Absences",
    "Montant forfait",
    "Montant repas à l'unité",
    "Total dû",
  ];

  // Montants en nombres BRUTS : ils restent sommables dans Excel (S18).
  const csvRows = rows.map((r) => [
    `${r.name} ${r.surname}`.trim(),
    r.username,
    r.className ?? "",
    r.planName ?? "",
    r.subscribedMeals,
    r.extraMeals,
    r.absences,
    r.planAmount,
    r.extraAmount,
    r.planAmount + r.extraAmount,
  ]);

  csvRows.push([
    "TOTAL",
    "",
    "",
    "",
    totals.subscribedMeals,
    totals.extraMeals,
    totals.absences,
    totals.planAmount,
    totals.extraAmount,
    totals.expected,
  ]);

  const csv = toCsv(headers, csvRows);
  const context = `${year}-${String(month).padStart(2, "0")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cantine-${context}.csv"`,
    },
  });
}
