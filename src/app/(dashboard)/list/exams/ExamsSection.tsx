import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Class, Exam, Prisma, Subject, Teacher } from "@/app/generated/prisma";
import { headers } from "next/headers";

import { sessionSchoolId } from "@/lib/authGuard";
type ExamList = Exam & {
  lesson: { subject: Subject; class: Class; teacher: Teacher };
};

// Onglet « Examens » de la page fusionnée examens/résultats (/list/exams).
const ExamsSection = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // V03 — cloisonnement : uniquement l'école de la session
  const schoolId = sessionSchoolId(session);
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const { page, ...queryParams } = searchParams;
  const columns = [
    {
      header: "Nom",
      accessor: "name",
    },
    {
      header: "Matieres",
      accessor: "subject",
    },
    {
      header: "Classe",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Enseignant",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Date de debut",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Date de fin",
      accessor: "date2",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "director" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const RenderRow = (item: ExamList) => (
    <tr
      key={item.id}
      className=" border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td className="hidden md:table-cell">{item.lesson.subject.name}</td>
      <td className="">{item.lesson.class.name}</td>
      <td className="hidden md:table-cell">
        {item.lesson.teacher.name + "" + item.lesson.teacher.surname}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.endTime)}
      </td>
      <td>
        <div className=" flex items-center gap-2">
          {(role === "admin" || role === "director") && (
            <>
              <FormContainer table="exam" type="update" data={item} />
              <FormContainer table="exam" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const p = page ? parseInt(page) : 1;

  // URL params condition
  const query: Prisma.ExamWhereInput = {};

  query.lesson = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lesson.classId = parseInt(value);
            break;
          case "teacherId":
            query.lesson.teacherId = value;
            break;

          case "search":
            query.lesson.subject = {
              name: { contains: value, mode: "insensitive" },
            };
            break;

          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.lesson.teacherId = currentUserId!;
      break;
    case "student":
      // W03 — l'appartenance à la classe passe par l'Enrollment
      query.lesson.class = {
        enrollments: {
          some: {
            studentId: currentUserId!,
          },
        },
      };
      break;
    case "parent":
      // W05 — le lien parent-enfant passe par StudentGuardian
      query.lesson.class = {
        enrollments: {
          some: {
            student: { guardians: { some: { parentId: currentUserId! } } },
          },
        },
      };
      break;

    default:
      break;
  }

  // Requete vers la base de donnéés
  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where: { AND: [{ lesson: { class: { schoolId } } }, query] },
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.exam.count({ where: { AND: [{ lesson: { class: { schoolId } } }, query] } }),
  ]);

  return (
    <div className=" bg-white p-4 rounded-md m-4 mt-0 flex-1">
      {/* TOP */}
      <div className=" flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">
          Toutes les exames
        </h1>
        <div className=" flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className=" flex items-center self-end gap-4">
            {(role === "admin" || role === "director" || role === "teacher") && (
              <FormContainer table="exam" type="create" />
            )}
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
export default ExamsSection;
