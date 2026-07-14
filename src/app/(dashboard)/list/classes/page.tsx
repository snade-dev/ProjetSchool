import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Class, Level, Prisma, SchoolYear, Teacher } from "@/app/generated/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { sessionSchoolId } from "@/lib/authGuard";
type ClassList = Class & {
  supervisor: Teacher;
  level: Level | null;
  schoolYear: SchoolYear;
};

const ClassListPage = async (props: {
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
      header: "Niveau",
      accessor: "level",
      className: "hidden md:table-cell",
    },
    {
      header: "Année",
      accessor: "schoolYear",
      className: "hidden lg:table-cell",
    },
    {
      header: "Capacité",
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: "Superviseur",
      accessor: "supervisor",
      className: "hidden md:table-cell",
    },
    ...((role === "admin" || role === "director")
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const RenderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className=" border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.level?.name ?? "—"}</td>
      <td className="hidden lg:table-cell text-gray-500">
        {item.schoolYear.name}
      </td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">
        {item.supervisor?.name + " " + item.supervisor?.surname}
      </td>
      <td>
        <div className=" flex items-center gap-2">
          {(role === "admin" || role === "director") && (
            <>
              {/* W08 — écran Matières & coefficients de la classe (§2.1.6) */}
              <Link
                href={`/list/classes/${item.id}/subjects`}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaYellow"
                title="Matières & coefficients"
              >
                <SlidersHorizontal size={14} />
              </Link>
              <FormContainer table="class" type="update" data={item} />
              <FormContainer table="class" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "supervisorId":
            query.supervisorId = value;
            break;
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

  // W02 — par défaut, seules les classes de l'année scolaire ACTIVE sont listées
  const activeYearFilter: Prisma.ClassWhereInput = {
    schoolYear: { isActive: true },
  };

  // Requete vers la base de donnéés
  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: { AND: [{ schoolId }, activeYearFilter, query] },
      include: {
        supervisor: true,
        level: true, // W02
        schoolYear: true, // W02
      },
      orderBy: [{ level: { order: "asc" } }, { name: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({
      where: { AND: [{ schoolId }, activeYearFilter, query] },
    }),
  ]);

  return (
    <div className=" bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className=" flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">
          Toutes les classes
        </h1>
        <div className=" flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className=" flex items-center self-end gap-4">
            {(role === "admin" || role === "director") && <FormContainer table="class" type="create" />}
          </div>
        </div>
      </div>
      {/* LIST */}
      <div className="">
        <Table columns={columns} renderRow={RenderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <div className="">
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};
export default ClassListPage;
