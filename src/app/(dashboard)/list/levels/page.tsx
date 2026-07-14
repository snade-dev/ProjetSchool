import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Level, Prisma } from "@/app/generated/prisma";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";

// W02 — niveaux scolaires (§2.1.4) : « CP », « 6ème »… créés librement par l'école.
type LevelList = Level & { _count: { classes: number } };

const LevelListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // Cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;

  const columns = [
    {
      header: "Nom",
      accessor: "name",
    },
    {
      header: "Ordre",
      accessor: "order",
      className: "hidden md:table-cell",
    },
    {
      header: "Cycle",
      accessor: "cycle",
      className: "hidden md:table-cell",
    },
    {
      header: "Classes",
      accessor: "classes",
      className: "hidden lg:table-cell",
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

  const RenderRow = (item: LevelList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
    >
      <td className="flex items-center gap-4 p-4 font-medium">{item.name}</td>
      <td className="hidden md:table-cell">{item.order}</td>
      <td className="hidden md:table-cell text-gray-500">
        {item.cycle ?? "—"}
      </td>
      <td className="hidden lg:table-cell text-gray-500">
        {item._count.classes} classe{item._count.classes > 1 ? "s" : ""}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "director") && (
            <>
              <FormContainer table="level" type="update" data={item} />
              <FormContainer table="level" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.LevelWhereInput = {};

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

  // Requête vers la base de données
  const [data, count] = await prisma.$transaction([
    prisma.level.findMany({
      where: { AND: [{ schoolId }, query] },
      include: { _count: { select: { classes: true } } },
      orderBy: { order: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.level.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Niveaux scolaires
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            {(role === "admin" || role === "director") && <FormContainer table="level" type="create" />}
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

export default LevelListPage;
