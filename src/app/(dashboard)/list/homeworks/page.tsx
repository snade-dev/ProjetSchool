import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { formatDueDate, homeworkDueBadge } from "@/lib/homework";
import { Class, Homework, Prisma, Subject } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sessionSchoolId } from "@/lib/authGuard";
import Link from "next/link";
import { Paperclip } from "lucide-react";

/**
 * W14 — Devoirs à faire (§2.3.8), consultation par rôle :
 * - teacher : SES devoirs (filtres classe/matière) + créer/éditer/supprimer ;
 * - student : les devoirs de SA classe (année active), triés par date de
 *   rendu, badge « à rendre demain / aujourd'hui / en retard » ;
 * - parent : les devoirs de ses enfants (sélecteur enfant si plusieurs) ;
 * - admin / director / supervisor : tous ceux de l'école (lecture ;
 *   admin/director peuvent aussi publier et corriger).
 */

type HomeworkList = Homework & { class: Class; subject: Subject } & {
  authorName: string;
};

const HomeworksListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const isStaff = role === "admin" || role === "director" || role === "supervisor";
  const canManage = role === "admin" || role === "director" || role === "teacher";

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // ---- Portée par rôle -----------------------------------------------------
  const query: Prisma.HomeworkWhereInput = {};

  if (queryParams.search) {
    query.title = { contains: queryParams.search, mode: "insensitive" };
  }

  // Filtres classe/matière (teacher + staff)
  const classIdParam = queryParams.classId ? parseInt(queryParams.classId) : undefined;
  const subjectIdParam = queryParams.subjectId ? parseInt(queryParams.subjectId) : undefined;

  // Sélecteur enfant (parent)
  let children: { id: string; name: string; surname: string }[] = [];
  let selectedChildId: string | undefined;

  if (role === "teacher") {
    query.teacherId = currentUserId!;
    if (classIdParam) query.classId = classIdParam;
    if (subjectIdParam) query.subjectId = subjectIdParam;
  } else if (role === "student") {
    // W03 — SA classe = l'inscription de l'année active
    query.class = {
      enrollments: {
        some: { studentId: currentUserId!, schoolYear: { isActive: true } },
      },
    };
  } else if (role === "parent") {
    // W05 — les enfants viennent de StudentGuardian
    const guardianRows = await prisma.studentGuardian.findMany({
      where: { parentId: currentUserId! },
      select: {
        student: { select: { id: true, name: true, surname: true } },
      },
      orderBy: { student: { name: "asc" } },
    });
    children = guardianRows.map((g) => g.student);
    selectedChildId =
      queryParams.childId && children.some((c) => c.id === queryParams.childId)
        ? queryParams.childId
        : undefined;
    const targetIds = selectedChildId
      ? [selectedChildId]
      : children.map((c) => c.id);
    query.class = {
      enrollments: {
        some: {
          studentId: { in: targetIds },
          schoolYear: { isActive: true },
        },
      },
    };
    // aucun enfant rattaché → ne rien montrer
    if (targetIds.length === 0) query.id = -1;
  } else if (isStaff) {
    if (classIdParam) query.classId = classIdParam;
    if (subjectIdParam) query.subjectId = subjectIdParam;
  } else {
    query.id = -1; // rôle inattendu : rien
  }

  // ---- Requête -------------------------------------------------------------
  // Élève/parent : échéances à venir d'abord ; staff/enseignant : les plus
  // récentes échéances en tête.
  const orderBy: Prisma.HomeworkOrderByWithRelationInput =
    role === "student" || role === "parent"
      ? { dueDate: "asc" }
      : { dueDate: "desc" };

  const [rows, count] = await prisma.$transaction([
    prisma.homework.findMany({
      where: { AND: [{ schoolId }, query] },
      include: { class: true, subject: true },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.homework.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  // Auteur (User.id — teacherId sans FK) : résolution des noms en une requête
  const authorIds = [...new Set(rows.map((r) => r.teacherId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorName = new Map(authors.map((a) => [a.id, a.name]));
  const data: HomeworkList[] = rows.map((r) => ({
    ...r,
    authorName: authorName.get(r.teacherId) ?? "—",
  }));

  // Options des filtres (teacher : ses classes/matières via Lessons ; staff :
  // toute l'école)
  let filterClasses: { id: number; name: string }[] = [];
  let filterSubjects: { id: number; name: string }[] = [];
  if (role === "teacher") {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: currentUserId!, class: { schoolId } },
      select: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    filterClasses = [...new Map(lessons.map((l) => [l.class.id, l.class])).values()];
    filterSubjects = [...new Map(lessons.map((l) => [l.subject.id, l.subject])).values()];
  } else if (isStaff) {
    [filterClasses, filterSubjects] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId, schoolYear: { isActive: true } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  }

  // ---- Rendu ---------------------------------------------------------------
  const columns = [
    { header: "Devoir", accessor: "title" },
    { header: "Classe", accessor: "class" },
    { header: "Matière", accessor: "subject", className: "hidden md:table-cell" },
    { header: "À rendre", accessor: "dueDate" },
    ...(role !== "student" && role !== "parent"
      ? [{ header: "Auteur", accessor: "author", className: "hidden lg:table-cell" }]
      : []),
    ...(canManage ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: HomeworkList) => {
    const badge = homeworkDueBadge(item.dueDate);
    const own = item.teacherId === currentUserId;
    const editable = role === "admin" || role === "director" || (role === "teacher" && own);
    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4">
          <Link
            href={`/list/homeworks/${item.id}`}
            className="flex items-center gap-2 font-medium hover:underline"
          >
            {item.title}
            {item.fileUrl && <Paperclip size={14} className="text-gray-400" />}
          </Link>
        </td>
        <td>{item.class?.name || "-"}</td>
        <td className="hidden md:table-cell">{item.subject?.name || "-"}</td>
        <td>
          <div className="flex items-center gap-2">
            <span>{formatDueDate(item.dueDate)}</span>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
        </td>
        {role !== "student" && role !== "parent" && (
          <td className="hidden lg:table-cell">{item.authorName}</td>
        )}
        {canManage && (
          <td>
            <div className="flex items-center gap-2">
              {editable && (
                <>
                  <FormContainer table="homework" type="update" data={item} />
                  <FormContainer table="homework" type="delete" id={item.id} />
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Devoirs à faire</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {canManage && <FormContainer table="homework" type="create" />}
          </div>
        </div>
      </div>

      {/* FILTRES — formulaire GET (aucun JS requis) */}
      {(filterClasses.length > 0 || children.length > 1) && (
        <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
          {queryParams.search && (
            <input type="hidden" name="search" value={queryParams.search} />
          )}
          {filterClasses.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Classe</label>
              <select
                name="classId"
                defaultValue={classIdParam ?? ""}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
              >
                <option value="">Toutes</option>
                {filterClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {filterSubjects.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Matière</label>
              <select
                name="subjectId"
                defaultValue={subjectIdParam ?? ""}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
              >
                <option value="">Toutes</option>
                {filterSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {children.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Enfant</label>
              <select
                name="childId"
                defaultValue={selectedChildId ?? ""}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
              >
                <option value="">Tous mes enfants</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.surname}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            className="rounded-md bg-lamaYellow px-4 py-2 text-sm font-medium"
          >
            Filtrer
          </button>
        </form>
      )}

      {/* LIST */}
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">
          Aucun devoir pour l&apos;instant.
        </p>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={data} />
      )}
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default HomeworksListPage;
