import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toCsv, formatDateFr } from "@/lib/csv";
import { buildInvoiceWhere } from "@/lib/queryBuilders";
import { InvoiceStatus } from "@/app/generated/prisma";

// Le proxy EXCLUT /api → la garde de session DANS ce handler est la SEULE
// protection (parade story-18).
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partielle",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const where = buildInvoiceWhere({
    status: sp.get("status") ?? undefined,
    month: sp.get("month") ?? undefined,
    search: sp.get("search") ?? undefined,
    schoolYearId: sp.get("schoolYearId") ?? undefined,
  });

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      // W03 — classe = inscription de l'élève sur l'année de la facture
      student: {
        include: {
          enrollments: {
            select: { schoolYearId: true, class: { select: { name: true } } },
          },
        },
      },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const headers = [
    "Référence",
    "Élève",
    "Classe",
    "Mois",
    "Total",
    "Payé",
    "Solde",
    "Statut",
    "Échéance",
  ];

  const rows = invoices.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return [
      inv.reference,
      `${inv.student.name} ${inv.student.surname}`,
      inv.student.enrollments.find((e) => e.schoolYearId === inv.schoolYearId)
        ?.class.name ?? "",
      inv.month ?? "",
      inv.total,
      paid,
      inv.total - paid,
      STATUS_LABELS[inv.status] ?? inv.status,
      formatDateFr(inv.dueDate),
    ];
  });

  const csv = toCsv(headers, rows);
  const context = sp.get("status") || "toutes";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factures-${context}.csv"`,
    },
  });
}
