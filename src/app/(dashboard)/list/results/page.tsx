import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@clerk/nextjs/server";
import { Exam, Prisma, Result, Student, Subject } from "@prisma/client";
import FormContainer from "@/components/FormContainer";
import ClientFilters from "./components/ClientFilters";
import ResultTable from "./components/ResultTable";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

// On utilise une intersection type pour ajouter "moyenne" au payload de Result.
type ResultList = Prisma.ResultGetPayload<{
  include: {
    exam: { select: { id: true; title: true } };
    semester: { select: { id: true; name: true } };
    subject: { select: { id: true; name: true } };
    student: {
      select: {
        id: true;
        name: true;
        surname: true;
        classId: true;
        class: { select: { name: true } };
      };
    };
  };
}> & { moyenne: number };

export default async function ResultListPage(
  props: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const { userId ,sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) {
    notFound();
  }

  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  // Récupération des données initiales pour les filtres
  const [classes, semesters, exams] = await Promise.all([
    prisma.class.findMany(),
    prisma.semester.findMany(),
    prisma.exam.findMany(),
  ]);

  // Construction de la query de base
  const query: Prisma.ResultWhereInput = {};

  if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

  if (role === "student") {
    query.student = { id:  userId};
  }


  if (searchParams.semesterId) {
    query.semesterId = parseInt(searchParams.semesterId);
  }

  if (searchParams.studentId) {
    query.student = {
      id: searchParams.studentId,
    };
  } else if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

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

  // Pour le calcul des moyennes, on clone la query et on exclut le filtre sur l'examen
  const averagesQuery = { ...query };
  delete averagesQuery.examId;

  // Modifier la requête pour inclure classScore
  const [data, count, averages] = await prisma.$transaction([
    prisma.result.findMany({
      where: {
        ...query,
        examId: searchParams.examId ? parseInt(searchParams.examId) : undefined,
      },
      include: {
        exam: { select: { id: true, title: true } },
        semester: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            classId: true,
            class: { select: { name: true } }, // Inclure classScore
          },
        },
      },
      distinct: ["studentId", "semesterId"],
      orderBy: { student: { name: "asc" } },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.result.count({
      where: {
        ...query,
        examId: searchParams.examId ? parseInt(searchParams.examId) : undefined,
      },
      
      
    }),
    prisma.result.groupBy({
      by: ["studentId", "semesterId"],
      _avg: { score: true },
      where: averagesQuery,
      orderBy: { studentId: "asc" },
    }),
  ]);

  if (!data || !role) return notFound();

  // Association de la moyenne calculée à chaque résultat
  const processedData: ResultList[] = data.map((result) => {
    const avgEntry = averages.find(
      (a) =>
        a.studentId === result.studentId &&
        a.semesterId === result.semesterId
    );
    const classScore = result.classScore ?? 0; // Récupérer classScore
    const score = result.score ?? 0; // Récupérer score
    const moyenne = (classScore * 0.4) + (score * 0.6); // Calculer la nouvelle moyenne

    return {
      ...result,
      moyenne: moyenne,
    };
  });

  const count2 =averages.length;

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
            initialExamId={searchParams.examId}
          />

          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="result" type="create" />
            )}
          </div>
        </div>
      </div>

      <ResultTable data={processedData} role={role} />

      <Pagination page={page} count={count2} />
    </div>
  );
}
