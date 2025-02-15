import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

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
// import ClickableStudentName from "./components/ClickableStudentName";
import ResultTable from "./components/ResultTable";
import { renderResultActions } from "./components/actions";
import ClickableStudentName from "./components/ClickableStudentName";
import prisma from "@/lib/prisma";

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
  const role: string | undefined = (
    sessionClaims?.metadata as { role?: string }
  )?.role;

  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  console.log(searchParams); // Vérifie si studentId est présent et correct

  // Récupération des données initiales
  const [classes, semesters] = await Promise.all([
    prisma.class.findMany(),
    prisma.semester.findMany(),
  ]);

  // Construction de la query
  const query: Prisma.ResultWhereInput = {};

  // Filtrer par classe si `classId` est défini
  if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

  // Filtrer par semestre si `semesterId` est défini
  if (searchParams.semesterId) {
    query.semesterId = parseInt(searchParams.semesterId);
  }

  // Filtrer par `studentId` si défini
  if (searchParams.studentId) {
    query.student = {
      id: searchParams.studentId
    };
  } else if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

  // Recherche par texte (examen ou nom de l'étudiant)
  if (searchParams.search) {
    query.OR = [
      {
        exam: {
          title: { contains: searchParams.search, mode: "insensitive" },
        },
      },
      {
        student: {
          name: { contains: searchParams.search, mode: "insensitive" },
        },
      },
    ];
  }

  // Pour déboguer
  console.log("SearchParams:", searchParams);
  console.log("Query finale:", JSON.stringify(query, null, 2));

  // Récupération des résultats
  const [data, count] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        exam: { select: { id: true, title: true } },
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      orderBy: {
        student: {
          name: "asc",
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.result.count({ where: query }),
  ]);

  // Pour déboguer
  console.log("Nombre de résultats:", count);
  console.log("Premier résultat:", data[0]);

  const actions = (role === "admin" || role === "teacher") && (
    <>
      <FormContainer table="result" type="update" data={data} />
      <FormContainer table="result" type="delete" id={data[0]?.id} />
    </>
  );

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
            initialStudentId={searchParams.studentId}
          />

          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="result" type="create" />
            )}
          </div>
        </div>
      </div>

      <ResultTable data={data} role={role ?? ""} actions={actions} />

      <Pagination page={page} count={count} />
    </div>
  );
}
