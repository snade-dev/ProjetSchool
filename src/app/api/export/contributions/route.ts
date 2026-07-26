import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { toCsv, formatDateFr } from "@/lib/csv";
import {
  getContributionRecap,
  CONTRIBUTION_STATUS_LABEL,
} from "@/lib/contribution";

/**
 * X06 — Export CSV du registre de cotisation d'un événement (§2.4).
 * Le proxy EXCLUT /api : la garde de session DANS ce handler est la SEULE
 * protection (convention S18/W10).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = session?.user.role ?? "";
  if (!session || !["admin", "director", "accountant"].includes(role)) {
    return new Response("Forbidden", { status: 403 });
  }

  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId =
    (session.user as { schoolId?: number | null }).schoolId ?? -1;

  const eventIdParam = request.nextUrl.searchParams.get("eventId");
  const eventId = eventIdParam ? parseInt(eventIdParam) : NaN;
  if (!Number.isFinite(eventId)) {
    return new Response("eventId manquant", { status: 400 });
  }

  const recap = await getContributionRecap({ eventId, schoolId });
  if (!recap) {
    return new Response("Cotisation introuvable", { status: 404 });
  }

  const headers = [
    "Élève",
    "Matricule",
    "Classe",
    "Attendu",
    "Versé",
    "Reste",
    "Statut",
    "Nombre de versements",
    "Dernier versement",
  ];

  // Montants en nombres BRUTS : ils restent sommables dans Excel (S18).
  const rows = recap.rows.map((r) => [
    `${r.name} ${r.surname}`.trim(),
    r.username,
    r.className ?? "",
    r.expected,
    r.paid,
    r.remaining,
    CONTRIBUTION_STATUS_LABEL[r.status],
    r.payments.length,
    r.payments.length > 0
      ? formatDateFr(r.payments[r.payments.length - 1].paidAt)
      : "",
  ]);

  rows.push([
    "TOTAL",
    "",
    "",
    recap.totals.expected,
    recap.totals.collected,
    recap.totals.remaining,
    `${recap.totals.rate}%`,
    "",
    "",
  ]);

  const csv = toCsv(headers, rows);
  // Nom de fichier : titre de l'événement assaini (pas d'accents ni d'espaces)
  const slug = recap.event.title
    // NFD sépare les accents de leur lettre, la plage U+0300–U+036F les retire :
    // « Fête » → « fete » plutôt que « f-te ».
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cotisation-${slug || recap.event.id}.csv"`,
    },
  });
}
