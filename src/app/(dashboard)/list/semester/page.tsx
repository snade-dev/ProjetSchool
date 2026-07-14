import FormContainer from "@/components/FormContainer";
import GeneratePeriodsButton from "./components/GeneratePeriodsButton";
import YearFilter from "./components/YearFilter";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import {
  Class,
  Prisma,
  Result,
  SchoolYear,
  Semester,
  Teacher,
  Subject,
} from "@/app/generated/prisma";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";
type SemesterList = Semester & {
  classes: Class[];
  results: Result[];
  subjects: Subject[];
  schoolYear: SchoolYear; // W02
};

const SemesterListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;

  const columns = [
    {
      header: "Nom",
      accessor: "name",
    },
    {
      header: "Régime",
      accessor: "system",
    },
    {
      header: "Année",
      accessor: "schoolYear",
      className: "hidden md:table-cell",
    },
    {
      header: "Ordre",
      accessor: "order",
      className: "hidden md:table-cell",
    },
    {
      header: "Libellé bulletin",
      accessor: "label",
      className: "hidden md:table-cell",
    },
    {
      header: "Matières",
      accessor: "subjects",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const RenderRow = (item: SemesterList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
    >
      <td className="flex items-center gap-4 p-4 font-medium">{item.name}</td>
      <td>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            item.system === "MONTHLY"
              ? "bg-lamaYellowLight text-yellow-800"
              : "bg-lamaSkyLight text-sky-800"
          }`}
        >
          {item.system === "MONTHLY" ? "Composition" : "Trimestre"}
        </span>
      </td>
      <td className="hidden md:table-cell text-gray-500">
        {item.schoolYear.name}
      </td>
      <td className="hidden md:table-cell">{item.order}</td>
      <td className="hidden md:table-cell text-gray-500">
        {item.label ?? "—"}
      </td>
      <td className="hidden lg:table-cell text-gray-500">
        {item.subjects.length} matière{item.subjects.length > 1 ? "s" : ""}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="semester" type="update" data={item} />
              <FormContainer table="semester" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.SemesterWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = {
              contains: value,
              mode: "insensitive",
            };
            break;
          default:
            break;
        }
      }
    }
  }

  // W02 — filtre par année scolaire : `yearId` dans l'URL, sinon l'année ACTIVE
  const years = await prisma.schoolYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
  });
  const requestedYearId = queryParams.yearId
    ? parseInt(queryParams.yearId)
    : undefined;
  const selectedYearId =
    requestedYearId != null && years.some((y) => y.id === requestedYearId)
      ? requestedYearId
      : years.find((y) => y.isActive)?.id;
  if (selectedYearId != null) {
    query.schoolYearId = selectedYearId;
  }

  // Requête vers la base de données
  const [data, count] = await prisma.$transaction([
    prisma.semester.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        results: true, // Inclure les résultats associés à ce semestre
        exams: true, // Inclure les examens associés à ce semestre
        subjects: true, // Inclure les matières associées à ce semestre
        schoolYear: true, // W02 — année de rattachement
      },
      orderBy: [{ system: "asc" }, { order: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.semester.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Périodes d&apos;évaluation
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          {/* W02 — filtre par année scolaire (année active par défaut) */}
          <YearFilter years={years} selectedYearId={selectedYearId} />
          <div className="flex items-center self-end gap-4">
            {role === "admin" && (
              <>
                <GeneratePeriodsButton />
                <FormContainer table="semester" type="create" />
              </>
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <div>
        <Table columns={columns} renderRow={RenderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <div>
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default SemesterListPage;
