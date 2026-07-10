import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Exam, ExamAverage, Prisma, Student } from "@/app/generated/prisma";
import { title } from "process";
import FormContainer from "@/components/FormContainer";
import { headers } from "next/headers";

type ResultList = ExamAverage & { exam: Exam } & { student: Student };

const AverageListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;
  // Requete vers la base de donnéés

  const columns = [
    // {
    //   header: "Noms",
    //   accessor: "title",
    // },
    {
      header: "Examen",
      accessor: "exam",
      className: "hidden md:table-cell",
    },
    {
      header: "Etudiants",
      accessor: "student",
    },
    {
      header: "Moyenne",
      accessor: "score",
      className: "hidden md:table-cell",
    },

    // {
    //   header: "Classes",
    //   accessor: "class",
    //   className: "hidden md:table-cell",
    // },

    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: ResultList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.exam.title}</td>
      <td className=" hidden md:table-cell">{item.student.name}</td>
      <td className="hidden md:table-cell">{item.average}</td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="average" type="update" data={item} />
              <FormContainer table="average" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  // URL params condition
  const query: Prisma.ExamAverageWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          // case "studentId":
          //   query.studentId = value;
          //   break;
          case "search":
            query.OR = [
              { exam: { title: { contains: title, mode: "insensitive" } } },
              { student: { name: { contains: title, mode: "insensitive" } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // Role conditions
  switch (role) {
    case "admin":
      break;
    // case "teacher":
    //   query.OR = [
    //     { exam: { lesson: { teacherId: currentUserId! } } },
    //   ];
    //   break;

    // case "student":
    //   query.studentId = currentUserId!;
    //   break;

    // case "parent":
    //   query.student = {
    //     parentId: currentUserId!,
    //   };
    //   break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.examAverage.findMany({
      where: query,
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.examAverage.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les resultats
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="average" type="create" />
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

export default AverageListPage;
