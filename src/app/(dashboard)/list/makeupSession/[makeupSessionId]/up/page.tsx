import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";

import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import {
  Exam,
  Prisma,
  Result,
  Student,
  Subject,
} from "@/app/generated/prisma";
import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientFilters from "../../../results/components/ClientFilters";
import ResultTable from "./components/ResultTable";
import { headers } from "next/headers";


type ResultList = Result & {
  exam: Exam;
  student: Student;
  subject: Subject;
};

export default async function ResultListPage(props: {
  params: Promise<{ makeupSessionId: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  console.log("Params:", params); // Vérifie si makeupSessionId est présent
  console.log("SearchParams:", searchParams); // Vérifie les autres filtres

  // Récupération des données initiales
  const [classes, semesters] = await Promise.all([
    prisma.class.findMany(),
    prisma.semester.findMany(),
  ]);

  // Construction de la query pour MakeupExam
  const query: Prisma.MakeupExamWhereInput = {
    session: { id: params.makeupSessionId }, // Utilisation du paramètre dynamique
  };

  // Filtrer par classe si `classId` est défini
  if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

  // Filtrer par `studentId` si défini
  if (searchParams.studentId) {
    query.student = {
      id: searchParams.studentId,
    };
  } else if (searchParams.classId) {
    query.student = {
      classId: parseInt(searchParams.classId),
    };
  }

  // Recherche par texte (nom de l'étudiant)
  if (searchParams.search) {
    query.OR = [
      {
        student: {
          name: { contains: searchParams.search, mode: "insensitive" },
        },
      },
    ];
  }

  console.log("Query finale:", JSON.stringify(query, null, 2));

  // Récupération des résultats
  const [data, count] = await prisma.$transaction([
    prisma.makeupExam.findMany({
      where: query,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: { select: { name: true } },
          },
        },
        session: { select: { semester: true } },
      },
      orderBy: { student: { name: "asc" } },
      distinct: ["studentId"],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.makeupExam.count({ where: query }),
  ]);

  if (!data || !role) {
    return notFound();
  }

  const aggregateResult = await prisma.result.aggregate({
    _avg: { score: true },
    where: { studentId: data[0]?.studentId },
  });

  const moyenne = aggregateResult._avg.score ?? 0;
  console.log("La moyenne des résultats est :", data);
  console.log("Nombre de résultats:", count);
  console.log("Premier résultat:", data[0]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Tous les résultats de rattrapages
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

      <ResultTable data={data} moyenne={moyenne} role={role} />

      <Pagination page={page} count={count} />
    </div>
  );
}
