import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { buildAuditWhere } from "@/lib/queryBuilders";

/**
 * W10 — Export CSV du journal d'audit (§2.11.4 : « export du journal »).
 * Mêmes filtres que /list/audit (buildAuditWhere partagé, règle S18).
 * Le proxy EXCLUT /api → la garde de session DANS ce handler est la SEULE
 * protection : admin/director = leur école, superadmin = tout (+ ?schoolId).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = session?.user.role ?? "";
  if (!session || !["admin", "director", "superadmin"].includes(role)) {
    return new Response("Forbidden", { status: 403 });
  }
  const isSuper = role === "superadmin";
  const sessionSchool =
    (session.user as { schoolId?: number | null }).schoolId ?? -1;

  const sp = request.nextUrl.searchParams;
  const schoolParam = sp.get("schoolId") ?? undefined;
  // admin/director : TOUJOURS leur école (le paramètre schoolId est ignoré)
  const scopeSchoolId = isSuper
    ? schoolParam && !Number.isNaN(parseInt(schoolParam))
      ? parseInt(schoolParam)
      : undefined
    : sessionSchool;

  const user = sp.get("user") ?? undefined;
  let userIds: string[] = [];
  if (user) {
    const matched = await prisma.user.findMany({
      where: { name: { contains: user, mode: "insensitive" } },
      select: { id: true },
      take: 200,
    });
    userIds = matched.map((m) => m.id);
  }

  const where = buildAuditWhere({
    module: sp.get("module") ?? undefined,
    user,
    userIds,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    scopeSchoolId,
  });

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    take: 10000,
  });

  // Résolution des noms pour des cellules lisibles
  const logUserIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = logUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: logUserIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const headers = [
    "Date",
    "Heure",
    "Utilisateur",
    "Rôle",
    "École (id)",
    "Action",
    "Entité",
    "Motif",
    "Avant",
    "Après",
    "IP",
  ];

  const rows = logs.map((l) => [
    new Intl.DateTimeFormat("fr-FR").format(l.at),
    new Intl.DateTimeFormat("fr-FR", { timeStyle: "medium" }).format(l.at),
    l.userId ? nameById.get(l.userId) ?? l.userId : "",
    l.role ?? "",
    l.schoolId ?? "",
    l.action,
    l.entity,
    l.reason ?? "",
    l.before != null ? JSON.stringify(l.before) : "",
    l.after != null ? JSON.stringify(l.after) : "",
    l.ip ?? "",
  ]);

  const csv = toCsv(headers, rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-audit.csv"`,
    },
  });
}
