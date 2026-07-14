import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { Observation, Prisma, Student } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sessionSchoolId } from "@/lib/authGuard";
import Link from "next/link";
import { EyeOff } from "lucide-react";
import {
  OBSERVATION_KINDS,
  OBSERVATION_KIND_LABELS,
  observationKindBadge,
  observationKindLabel,
} from "@/lib/observation";

/**
 * W15 — Observations & discipline (§2.3.7), vue d'ensemble de l'école :
 * admin / director / supervisor uniquement (les enseignants saisissent depuis
 * la fiche élève, limités à leurs classes). Liste filtrable (élève, type,
 * période) + création rapide ; modification/suppression par l'auteur ou
 * admin/director (revérifié côté serveur).
 */

type ObservationList = Observation & { student: Student } & {
  authorName: string;
  className: string | null;
};

const ObservationsListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  if (!role || !["admin", "director", "supervisor"].includes(role)) {
    return notFound();
  }

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // ---- Filtres : élève (recherche nom), type, période -----------------------
  const query: Prisma.ObservationWhereInput = {};

  if (queryParams.search) {
    query.student = {
      OR: [
        { name: { contains: queryParams.search, mode: "insensitive" } },
        { surname: { contains: queryParams.search, mode: "insensitive" } },
      ],
    };
  }
  const kindParam = OBSERVATION_KINDS.find((k) => k === queryParams.kind);
  if (kindParam) query.kind = kindParam;

  const isDay = (v?: string) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
  const from = isDay(queryParams.from) ? queryParams.from : undefined;
  const to = isDay(queryParams.to) ? queryParams.to : undefined;
  if (from || to) {
    query.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    };
  }

  const [rows, count] = await prisma.$transaction([
    prisma.observation.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        student: {
          include: {
            enrollments: {
              where: { schoolYear: { isActive: true } },
              select: { class: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.observation.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  // Auteur (User.id sans FK, même convention que Homework.teacherId) :
  // résolution des noms en UNE requête.
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorName = new Map(authors.map((a) => [a.id, a.name]));
  const data: ObservationList[] = rows.map((r) => ({
    ...r,
    authorName: authorName.get(r.authorId) ?? "—",
    className: r.student.enrollments[0]?.class.name ?? null,
  }));

  // ---- Rendu ---------------------------------------------------------------
  const columns = [
    { header: "Élève", accessor: "student" },
    { header: "Type", accessor: "kind" },
    { header: "Observation", accessor: "content", className: "hidden md:table-cell" },
    { header: "Auteur", accessor: "author", className: "hidden lg:table-cell" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: ObservationList) => {
    const editable =
      role === "admin" || role === "director" || item.authorId === currentUserId;
    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4">
          <Link
            href={`/list/students/${item.studentId}`}
            className="font-medium hover:underline"
          >
            {item.student.name} {item.student.surname}
          </Link>
          {item.className && (
            <span className="block text-xs text-gray-400">{item.className}</span>
          )}
        </td>
        <td>
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${observationKindBadge(item.kind)}`}
            >
              {observationKindLabel(item.kind)}
            </span>
            {!item.sharedWithParents && (
              // §2.7.8 — confidentielle : jamais visible du parent ni de l'élève
              <span
                title="Confidentielle — non partagée avec les parents"
                className="text-gray-400"
              >
                <EyeOff size={13} />
              </span>
            )}
          </div>
        </td>
        <td className="hidden md:table-cell max-w-[320px]">
          <span className="line-clamp-2">{item.content}</span>
        </td>
        <td className="hidden lg:table-cell">{item.authorName}</td>
        <td className="hidden md:table-cell">
          {new Intl.DateTimeFormat("fr-FR").format(new Date(item.createdAt))}
        </td>
        <td>
          <div className="flex items-center gap-2">
            {editable && (
              <>
                <FormContainer table="observation" type="update" data={item} />
                <FormContainer table="observation" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Observations & discipline
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {/* création rapide (élève choisi dans le formulaire) */}
            <FormContainer table="observation" type="create" />
          </div>
        </div>
      </div>

      {/* FILTRES — formulaire GET (aucun JS requis) */}
      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        {queryParams.search && (
          <input type="hidden" name="search" value={queryParams.search} />
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Type</label>
          <select
            name="kind"
            defaultValue={kindParam ?? ""}
            className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
          >
            <option value="">Tous</option>
            {OBSERVATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {OBSERVATION_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Du</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Au</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none"
          />
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
          Aucune observation pour l&apos;instant.
        </p>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={data} />
      )}
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ObservationsListPage;
