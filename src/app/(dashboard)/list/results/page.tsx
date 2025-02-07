import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@clerk/nextjs/server";
import {
  Exam,
  Prisma,
  Result,
  Student,
  Subject,
  Class,
  Semester,
} from "@prisma/client";
import FormContainer from "@/components/FormContainer";
import ClientFilters from "./components/ClientFilters";


type ResultList = Result & {
  exam: Exam;
  student: Student;
  subject: Subject;
};

export default async function ResultListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  // Récupération des données initiales
  const [classes, semesters] = await Promise.all([
    prisma.class.findMany(),
    prisma.semester.findMany(),
  ]);

  // Construction de la query
  const query: Prisma.ResultWhereInput = {};
  if (searchParams.classId) {
    query.student = { classId: parseInt(searchParams.classId) };
  }
  if (searchParams.semesterId) {
    query.semesterId = parseInt(searchParams.semesterId);
  }
  if (searchParams.search) {
    query.OR = [
      {
        exam: { title: { contains: searchParams.search, mode: "insensitive" } },
      },
      {
        student: {
          name: { contains: searchParams.search, mode: "insensitive" },
        },
      },
    ];
  }

  // Récupération des résultats
  const [data, count] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        exam: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.result.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les résultats
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <ClientFilters
            classes={classes}
            semesters={semesters}
            initialClassId={searchParams.classId}
            initialSemesterId={searchParams.semesterId}
          />

          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="result" type="create" />
            )}
          </div>
        </div>
      </div>

      <Table
        columns={[
          {
            header: "Examen",
            accessor: "exam",
            className: "hidden md:table-cell",
          },
          { header: "Etudiants", accessor: "student" },
          { header: "Matière", accessor: "subject" },
          {
            header: "Note",
            accessor: "score",
            className: "hidden md:table-cell",
          },
          ...(role === "admin" || role === "teacher"
            ? [{ header: "Actions", accessor: "action" }]
            : []),
        ]}
        renderRow={(item: ResultList) => (
          <tr
            key={item.id}
            className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
          >
            <td className="flex items-center gap-4 p-4">
              {item.exam?.title || "-"}
            </td>
            <td>{item.student.name}</td>
            <td>{item.subject.name}</td>
            <td className="hidden md:table-cell">{item.score}</td>
            <td>
              <div className="flex items-center gap-2">
                {(role === "admin" || role === "teacher") && (
                  <>
                    <FormContainer table="result" type="update" data={item} />
                    <FormContainer table="result" type="delete" id={item.id} />
                  </>
                )}
              </div>
            </td>
          </tr>
        )}
        data={data}
      />

      <Pagination page={page} count={count} />
    </div>
  );
}
