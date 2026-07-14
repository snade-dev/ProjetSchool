import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import JustificationDecision from "@/components/JustificationDecision";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sessionSchoolId } from "@/lib/authGuard";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import {
  JUSTIFICATION_STATUS_BADGES,
  JUSTIFICATION_STATUS_LABELS,
} from "@/lib/observation";

/**
 * W15 — Justifications d'absence (§2.3.6), côté école :
 * admin / director / supervisor. Les demandes EN ATTENTE arrivent en tête
 * (tri par statut puis date), avec Accepter / Refuser (motif optionnel) ;
 * l'historique (acceptées / refusées) suit. Accepter pose
 * Attendance.justified=true et notifie le parent (type ABSENCE).
 */

type JustificationRow = Prisma.AbsenceJustificationGetPayload<{
  include: {
    attendance: {
      select: {
        date: true;
        sessionDay: true;
        student: { select: { id: true; name: true; surname: true } };
        class: { select: { name: true } };
      };
    };
    parent: { select: { name: true; surname: true } };
  };
}> & { deciderName: string | null };

const JustificationsListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;

  if (!role || !["admin", "director", "supervisor"].includes(role)) {
    return notFound();
  }

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AbsenceJustificationWhereInput = {};
  if (queryParams.search) {
    query.attendance = {
      student: {
        OR: [
          { name: { contains: queryParams.search, mode: "insensitive" } },
          { surname: { contains: queryParams.search, mode: "insensitive" } },
        ],
      },
    };
  }
  if (
    queryParams.status &&
    ["PENDING", "COMPLETED", "REJECTED"].includes(queryParams.status)
  ) {
    query.status = queryParams.status as "PENDING" | "COMPLETED" | "REJECTED";
  }

  const [rows, count, pendingCount] = await prisma.$transaction([
    prisma.absenceJustification.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        attendance: {
          select: {
            date: true,
            sessionDay: true,
            student: { select: { id: true, name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
        parent: { select: { name: true, surname: true } },
      },
      // PENDING en tête (ordre de déclaration de l'enum), puis plus récentes
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.absenceJustification.count({ where: { AND: [{ schoolId }, query] } }),
    prisma.absenceJustification.count({
      where: { schoolId, status: "PENDING" },
    }),
  ]);

  // Décideur (User.id sans FK) : noms résolus en une requête.
  const deciderIds = [
    ...new Set(rows.map((r) => r.decidedById).filter((id): id is string => !!id)),
  ];
  const deciders = await prisma.user.findMany({
    where: { id: { in: deciderIds } },
    select: { id: true, name: true },
  });
  const deciderName = new Map(deciders.map((d) => [d.id, d.name]));
  const data: JustificationRow[] = rows.map((r) => ({
    ...r,
    deciderName: r.decidedById ? deciderName.get(r.decidedById) ?? "—" : null,
  }));

  const columns = [
    { header: "Élève", accessor: "student" },
    { header: "Absence", accessor: "absence" },
    { header: "Parent", accessor: "parent", className: "hidden lg:table-cell" },
    { header: "Motif", accessor: "reason", className: "hidden md:table-cell" },
    { header: "Statut", accessor: "status" },
    { header: "Décision", accessor: "decision" },
  ];

  const renderRow = (item: JustificationRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">
        <Link
          href={`/list/students/${item.attendance.student.id}`}
          className="font-medium hover:underline"
        >
          {item.attendance.student.name} {item.attendance.student.surname}
        </Link>
        <span className="block text-xs text-gray-400">
          {item.attendance.class.name}
        </span>
      </td>
      <td>
        {new Intl.DateTimeFormat("fr-FR").format(new Date(item.attendance.date))}
        <span className="block text-xs text-gray-400">
          {item.attendance.sessionDay === "MORNING" ? "Matin" : "Soir"}
        </span>
      </td>
      <td className="hidden lg:table-cell">
        {item.parent.name} {item.parent.surname}
      </td>
      <td className="hidden md:table-cell max-w-[280px]">
        <span className="line-clamp-2">{item.reason}</span>
        {item.fileUrl && (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex w-max items-center gap-1 text-xs text-blue-500 hover:underline"
          >
            <Paperclip size={12} />
            Document joint
          </a>
        )}
      </td>
      <td>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            JUSTIFICATION_STATUS_BADGES[item.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {JUSTIFICATION_STATUS_LABELS[item.status] ?? item.status}
        </span>
      </td>
      <td>
        {item.status === "PENDING" ? (
          <JustificationDecision id={item.id} />
        ) : (
          <div className="text-xs text-gray-500">
            {item.deciderName && <span>{item.deciderName}</span>}
            {item.decidedAt && (
              <span className="block text-gray-400">
                {new Intl.DateTimeFormat("fr-FR").format(
                  new Date(item.decidedAt)
                )}
              </span>
            )}
            {item.decisionNote && (
              <span className="block italic text-gray-400">
                « {item.decisionNote} »
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Justifications d&apos;absence
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {pendingCount} en attente
            </span>
          )}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
        </div>
      </div>

      {/* FILTRE statut — formulaire GET */}
      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        {queryParams.search && (
          <input type="hidden" name="search" value={queryParams.search} />
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Statut</label>
          <select
            name="status"
            defaultValue={queryParams.status ?? ""}
            className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="COMPLETED">Acceptées</option>
            <option value="REJECTED">Refusées</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-lamaYellow px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
      </form>

      {/* LIST */}
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">
          Aucune justification pour l&apos;instant.
        </p>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={data} />
      )}
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default JustificationsListPage;
