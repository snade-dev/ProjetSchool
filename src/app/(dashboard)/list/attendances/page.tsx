import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import {
  Attendance,
  Class,
  Prisma,
  Student,
  Subject,
} from "@/app/generated/prisma";
import clsx from "clsx";
import Link from "next/link";
import { ClipboardCheck, Pencil } from "lucide-react";
import { headers } from "next/headers";
import AttendanceFilters from "@/components/AttendanceFilters";
import JustifyAbsenceButton from "@/components/JustifyAbsenceButton";
import {
  JUSTIFICATION_STATUS_BADGES,
  JUSTIFICATION_STATUS_LABELS,
} from "@/lib/observation";

import { sessionSchoolId } from "@/lib/authGuard";
type AttendanceList = Attendance & { class: Class } & { student: Student } & {
  subject: Subject;
} & {
  // W15 — justification déposée par un tuteur (statut affiché au parent)
  justification: { id: number; status: string } | null;
};

const AttendanceListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const userId = session?.user.id;

  // Colonnes du tableau
  const columns = [
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Présent", accessor: "present" },
    {
      header: "Session",
      accessor: "session",
      className: "hidden md:table-cell",
    }, // Nouvelle colonne
    {
      header: "Étudiant",
      accessor: "student.name",
      className: "hidden md:table-cell",
    },
    {
      header: "class",
      accessor: "class.name",
      className: "hidden md:table-cell",
    },
    {
      header: "Matiere",
      accessor: "subject.name",
      className: "hidden md:table-cell",
    },
    // W15 — le parent voit le statut de ses justifications et peut justifier
    ...(role === "parent"
      ? [{ header: "Justification", accessor: "justification" }]
      : []),
    ...(["admin", "director", "teacher", "supervisor"].includes(role ?? "")
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  // Génération des lignes
  const renderRow = (item: AttendanceList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("fr-FR").format(new Date(item.date))}
      </td>
      <td
        className={clsx("flex items-center gap-4 p-4", {
          "text-green-500 font-bold": item.present,
          // W15 — « Absent (justifié) » (§2.3.6) : posé par l'acceptation
          // d'une justification, affiché en ambre plutôt qu'en rouge
          "font-bold text-amber-600": !item.present && item.justified,
          "font-bold text-red-600": !item.present && !item.justified,
        })}
      >
        {item.present
          ? "Présent"
          : item.justified
          ? "Absent (justifié)"
          : "Absent"}
      </td>
      <td className="hidden md:table-cell">
        {item.sessionDay === "MORNING"
          ? "Matin"
          : item.sessionDay === "EVENING"
          ? "Soir"
          : "N/A"}
      </td>
      <td className="hidden md:table-cell">{item.student?.name || "N/A"}</td>
      <td className="hidden md:table-cell">{item.class?.name || "N/A"}</td>
      <td className="hidden md:table-cell">{item.subject?.name || "N/A"}</td>
      {/* W15 — colonne parent : statut de la justification ou bouton « Justifier »
          sur une absence non justifiée de SES enfants (§2.3.6) */}
      {role === "parent" && (
        <td>
          {item.present ? (
            <span className="text-xs text-gray-300">—</span>
          ) : item.justification ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                JUSTIFICATION_STATUS_BADGES[item.justification.status] ??
                "bg-gray-100 text-gray-600"
              }`}
            >
              {JUSTIFICATION_STATUS_LABELS[item.justification.status] ??
                item.justification.status}
            </span>
          ) : (
            <JustifyAbsenceButton
              attendanceId={item.id}
              studentName={`${item.student?.name ?? ""} ${
                item.student?.surname ?? ""
              }`.trim()}
              date={new Intl.DateTimeFormat("fr-FR").format(
                new Date(item.date)
              )}
            />
          )}
        </td>
      )}
      {["admin", "director", "teacher", "supervisor"].includes(role ?? "") && (
        <td>
          <div className="flex items-center gap-2">
            {/* Modifier la présence de CE jour (feuille d'appel préremplie) */}
            <Link
              href={`/list/attendances/appel?classId=${item.classId}&subjectId=${
                item.subjectId
              }&date=${new Date(item.date)
                .toISOString()
                .slice(0, 10)}&session=${item.sessionDay}`}
              title="Modifier l'appel de ce jour"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky hover:opacity-80"
            >
              <Pencil size={14} />
            </Link>
            {["admin", "director", "supervisor"].includes(role ?? "") && (
              <>
                <FormContainer table="attendance" type="update" data={item} />
                <FormContainer table="attendance" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  // Gestion des paramètres de recherche
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AttendanceWhereInput = {};

  // Filtres : classe et jour (params URL)
  const filterClassId = queryParams.classId
    ? parseInt(queryParams.classId)
    : undefined;
  if (filterClassId) {
    query.classId = filterClassId;
  }
  const filterDate = /^\d{4}-\d{2}-\d{2}$/.test(queryParams.date ?? "")
    ? (queryParams.date as string)
    : undefined;
  if (filterDate) {
    const day = new Date(`${filterDate}T00:00:00`);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { gte: day, lt: nextDay };
  }

  // Ajout de filtres basés sur la recherche
  if (queryParams.search) {
    query.OR = [
      {
        student: {
          name: { contains: queryParams.search, mode: "insensitive" },
        },
      },
      {
        subject: {
          name: { contains: queryParams.search, mode: "insensitive" },
        },
      },
      {
        class: { name: { contains: queryParams.search, mode: "insensitive" } },
      },
    ];
  }

  // Restrictions par rôle (défense en profondeur) : un élève ne voit que ses
  // pointages, un parent ceux de ses enfants, un teacher ceux de ses classes.
  if (!role || !userId) {
    return null;
  }
  if (role === "student") {
    query.studentId = userId;
  } else if (role === "parent") {
    // W05 — les enfants du parent via StudentGuardian
    query.student = { guardians: { some: { parentId: userId } } };
  } else if (role === "teacher") {
    query.class = { lessons: { some: { teacherId: userId } } };
  }

  // Requête vers la base de données (+ classes pour le filtre)
  const [data, count, classes] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: { AND: [{ class: { schoolId } }, query] },
      include: {
        student: true, // Inclure les détails de l'étudiant
        subject: true, // Inclure les détails de la leçon
        class: true,
        // W15 — statut de la justification éventuelle (colonne parent)
        justification: { select: { id: true, status: true } },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: { AND: [{ class: { schoolId } }, query] } }),
    prisma.class.findMany({
      // W02 — filtre : classes de l'école, année scolaire active uniquement
      where: { schoolId, schoolYear: { isActive: true } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Liste des présences
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <AttendanceFilters
            classes={classes}
            selectedClassId={filterClassId}
            date={filterDate}
          />
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {["admin", "director", "teacher", "supervisor"].includes(role ?? "") && (
              <Link
                href="/list/attendances/appel"
                className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white text-sm font-semibold rounded-md px-4 py-2 transition"
              >
                <ClipboardCheck size={16} />
                Faire l&apos;appel
              </Link>
            )}
            {["admin", "director", "supervisor"].includes(role ?? "") && (
              <FormContainer table="attendance" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceListPage;
