import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Class, Prisma, Quiz, Subject, Teacher } from "@/app/generated/prisma";
import Link from "next/link";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";
type createQuiz = Quiz & { class: Class } & { subject: Subject } & {
  teacher: Teacher;
};

const QuizListPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Matiere",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Enseignant",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Questions",
      accessor: "questions",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
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

  const renderRow = (item: createQuiz) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td className=" hidden md:table-cell">{item.class?.name || "-"}</td>
      <td className=" hidden md:table-cell">{item.subject?.name || "-"}</td>
      <td className=" hidden md:table-cell">{item.teacher?.username || "-"}</td>
      <td>
        <Link href={`quiz/${item.id}?teacherId=${item.teacher.id}`}>
          <button className="px-3 py-1 bg-lamaSky rounded hover:bg-lamaYellowDark text-white">
            Ajouter des questions
          </button>
        </Link>
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td>
        <div className=" flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="quiz" type="update" data={item} />
              <FormContainer table="quiz" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.QuizWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "admin":
            break;
          case "search":
            query.title = {
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

  // Role condition
  const roleConditions = {
    student: { enrollments: { some: { studentId: currentUserId! } } }, // W03
  };

  if (role === "admin") {
    // L'admin peut tout voir, pas besoin de filtrer par classe
  } else {
    // Pour les autres rôles, appliquer des conditions spécifiques
    // query.OR = [
    //   { classId: undefined },
    //   { class: roleConditions[role as keyof typeof roleConditions] || {} },
    // ];
  }

  // Requete vers la base de donnéés
  const [data, count] = await prisma.$transaction([
    prisma.quiz.findMany({
      where: { AND: [{ schoolId }, query] },
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
      orderBy: {
        title: "asc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.quiz.count({ where: { AND: [{ schoolId }, query] } }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Touts les devoirs en ligne
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="quiz" type="create" />}
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

export default QuizListPage;
