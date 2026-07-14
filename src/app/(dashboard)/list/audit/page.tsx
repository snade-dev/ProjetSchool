import Pagination from "@/components/Pagination";
import ExportCsvButton from "@/components/ExportCsvButton";
import AuditFilters from "./components/AuditFilters";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { sessionSchoolId } from "@/lib/authGuard";
import { buildAuditWhere } from "@/lib/queryBuilders";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";

/**
 * W10 — Écran « Journal d'audit » (§2.11.4).
 * - admin / director : les actions de LEUR école uniquement.
 * - superadmin : tout le journal + filtre par école (ses propres accès aux
 *   données d'une école sont eux-mêmes dans le journal, §2.11.5).
 * Lecture SEULE : la table est append-only, aucune action de modification
 * n'existe (ni ici, ni ailleurs).
 */

// Badge de module (couleur stable dérivée du préfixe d'action)
const MODULE_BADGES = [
  "bg-lamaSkyLight text-sky-800",
  "bg-lamaPurpleLight text-purple-800",
  "bg-lamaYellowLight text-yellow-800",
  "bg-green-50 text-green-700",
  "bg-red-50 text-red-700",
  "bg-orange-50 text-orange-700",
];
const moduleBadge = (action: string) => {
  const mod = action.split(".")[0] ?? "";
  let h = 0;
  for (let i = 0; i < mod.length; i++) h = (h * 31 + mod.charCodeAt(i)) % 997;
  return MODULE_BADGES[h % MODULE_BADGES.length];
};

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);

const AuditListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role ?? "";

  // Défense en profondeur (le proxy garde déjà la route)
  if (!["admin", "director", "superadmin"].includes(role)) {
    return notFound();
  }
  const isSuper = role === "superadmin";

  const { page, module, user, from, to, schoolId: schoolParam } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Scope école : imposé pour admin/director, optionnel pour superadmin.
  const scopeSchoolId = isSuper
    ? schoolParam && !Number.isNaN(parseInt(schoolParam))
      ? parseInt(schoolParam)
      : undefined
    : sessionSchoolId(session);

  // Filtre utilisateur : résolution des comptes dont le NOM matche la saisie
  // (le journal ne stocke que l'id) — le builder combine avec userId contains.
  let userIds: string[] = [];
  if (user) {
    const matched = await prisma.user.findMany({
      where: { name: { contains: user, mode: "insensitive" } },
      select: { id: true },
      take: 200,
    });
    userIds = matched.map((m) => m.id);
  }

  const query = buildAuditWhere({ module, user, userIds, from, to, scopeSchoolId });

  const [logs, count] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: query,
      orderBy: { at: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.auditLog.count({ where: query }),
  ]);

  // Résolution des noms (utilisateurs + écoles) pour l'affichage
  const logUserIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const logSchoolIds = [...new Set(logs.map((l) => l.schoolId).filter((s) => s != null))] as number[];
  const [logUsers, logSchools, moduleRows, allSchools] = await Promise.all([
    logUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: logUserIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    isSuper && logSchoolIds.length
      ? prisma.school.findMany({
          where: { id: { in: logSchoolIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    // Modules réellement présents (dans le périmètre visible) pour le filtre
    prisma.auditLog.findMany({
      where:
        scopeSchoolId !== undefined ? { schoolId: scopeSchoolId } : undefined,
      distinct: ["action"],
      select: { action: true },
    }),
    isSuper
      ? prisma.school.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const userNameById = new Map(logUsers.map((u) => [u.id, u.name]));
  const schoolNameById = new Map(logSchools.map((s) => [s.id, s.name]));
  const modules = [...new Set(moduleRows.map((r) => r.action.split(".")[0]))].sort();

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="hidden md:flex items-center gap-2 text-lg font-semibold">
            <ScrollText size={18} className="text-gray-500" />
            Journal d&apos;audit
          </h1>
          <p className="hidden md:block text-xs text-gray-400 mt-0.5">
            Registre inviolable des actions sensibles (§2.11) — lecture seule,
            aucune entrée ne peut être modifiée ni supprimée.
          </p>
        </div>
        <ExportCsvButton
          endpoint="audit"
          filename="journal-audit"
          label="Exporter CSV"
        />
      </div>

      {/* FILTRES */}
      <div className="mt-4">
        <AuditFilters
          module={module}
          user={user}
          from={from}
          to={to}
          schoolId={schoolParam}
          modules={modules}
          schools={allSchools}
        />
      </div>

      {/* LISTE — chaque entrée est dépliable (before/after) */}
      <div className="mt-4">
        {/* En-tête de colonnes */}
        <div
          className={`hidden md:grid ${
            isSuper ? "md:grid-cols-[150px_1fr_110px_170px_1fr_140px_1fr]" : "md:grid-cols-[150px_1fr_110px_170px_1fr_1fr]"
          } gap-2 px-3 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200`}
        >
          <span>Date / heure</span>
          <span>Utilisateur</span>
          <span>Rôle</span>
          <span>Action</span>
          <span>Entité</span>
          {isSuper && <span>École</span>}
          <span>Motif</span>
        </div>

        {logs.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            Aucune entrée d&apos;audit pour ces filtres.
          </p>
        ) : (
          logs.map((log) => {
            const hasDetails = log.before != null || log.after != null || log.ip;
            return (
              <details
                key={log.id.toString()}
                className="group border-b border-gray-100 even:bg-slate-50 text-sm"
              >
                <summary
                  className={`grid grid-cols-2 ${
                    isSuper
                      ? "md:grid-cols-[150px_1fr_110px_170px_1fr_140px_1fr]"
                      : "md:grid-cols-[150px_1fr_110px_170px_1fr_1fr]"
                  } gap-2 px-3 py-3 items-center cursor-pointer list-none hover:bg-lamaPurpleLight/40 [&::-webkit-details-marker]:hidden`}
                >
                  <span className="whitespace-nowrap text-gray-600">
                    {fmtDateTime(log.at)}
                  </span>
                  <span className="truncate font-medium">
                    {log.userId
                      ? userNameById.get(log.userId) ?? log.userId
                      : "—"}
                  </span>
                  <span className="text-xs text-gray-500">{log.role ?? "—"}</span>
                  <span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${moduleBadge(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </span>
                  <span className="truncate text-gray-600">{log.entity}</span>
                  {isSuper && (
                    <span className="truncate text-xs text-gray-500">
                      {log.schoolId != null
                        ? schoolNameById.get(log.schoolId) ?? `École #${log.schoolId}`
                        : "Plateforme"}
                    </span>
                  )}
                  <span className="truncate text-xs italic text-gray-500">
                    {log.reason ?? "—"}
                  </span>
                </summary>
                <div className="px-3 pb-3 pl-6">
                  {hasDetails ? (
                    <div className="flex flex-col lg:flex-row gap-3">
                      {log.before != null && (
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Avant
                          </p>
                          <pre className="rounded-md bg-red-50 ring-1 ring-red-100 p-2 text-xs overflow-x-auto">
                            {JSON.stringify(log.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after != null && (
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Après
                          </p>
                          <pre className="rounded-md bg-green-50 ring-1 ring-green-100 p-2 text-xs overflow-x-auto">
                            {JSON.stringify(log.after, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.ip && (
                        <div className="text-xs text-gray-400 self-end">
                          IP : {log.ip}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Aucun détail avant/après pour cette entrée.
                    </p>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AuditListPage;
