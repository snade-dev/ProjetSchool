import FormContainer from "@/components/FormContainer";
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
  Semester,
  Teacher,
  Subject,
} from "@/app/generated/prisma";
import { headers } from "next/headers";

type SemesterList = Semester & {
  classes: Class[];
  results: Result[];
  subjects: Subject[];
};

const SemesterListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;

  const columns = [
    {
      header: "Nom",
      accessor: "name",
    },
    {
      header: "Matières",
      accessor: "subjects", // Ajoute une colonne pour les matières
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
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td>
        {/* Affichage des matières associées au semestre */}
        <ul className="list-disc pl-5 text-sm">
          {item.subjects.map((subject) => (
            <li className="list-none" key={subject.id}>
              {subject.name}
            </li>
          ))}
        </ul>
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

  // Requête vers la base de données
  const [data, count] = await prisma.$transaction([
    prisma.semester.findMany({
      where: query,
      include: {
        results: true, // Inclure les résultats associés à ce semestre
        exams: true, // Inclure les examens associés à ce semestre
        subjects: true, // Inclure les matières associées à ce semestre
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.semester.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les semestres
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            {role === "admin" && (
              <FormContainer table="semester" type="create" />
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
