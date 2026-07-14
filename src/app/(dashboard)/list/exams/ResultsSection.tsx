import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { auth } from "@/lib/auth";
import { Exam, Prisma, Result, Student, Subject } from "@/app/generated/prisma";
import FormContainer from "@/components/FormContainer";
import ClientFilters from "../results/components/ClientFilters";
import ResultTable from "../results/components/ResultTable";
import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { notFound } from "next/navigation";
import { headers } from "next/dist/server/request/headers";
import { buildClassReportCards, ReportCardData } from "@/lib/reportCard";

import type { ResultRow } from "../results/components/types";

// W03 — la classe de chaque ligne est résolue via l'Enrollment de l'année de
// la période, puis aplatie dans le type partagé ResultRow.
type ResultList = ResultRow & { moyenne: number };

// Onglet « Résultats & bulletins » de la page fusionnée examens/résultats (/list/exams).
export default async function ResultsSection({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const userId = session?.user.id;
  const schoolId = sessionSchoolId(session); // V03 — cloisonnement

  if (!userId) {
    notFound();
  }

  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  // Récupération des données initiales pour les filtres.
  // V01 — si une classe est filtrée, seules les périodes de son régime sont proposées.
  const filterClassId = searchParams.classId
    ? parseInt(searchParams.classId)
    : undefined;
  const filterClass = filterClassId
    ? await prisma.class.findUnique({
        where: { id: filterClassId },
        select: { evaluationSystem: true },
      })
    : null;
  const [classes, semesters, exams] = await Promise.all([
    // V03 — cloisonnement ; W02 — sélecteur limité à l'année scolaire active
    prisma.class.findMany({
      where: { schoolId, schoolYear: { isActive: true } },
    }),
    prisma.semester.findMany({
      where: {
        schoolId, // V03
        schoolYear: { isActive: true }, // W02 — périodes de l'année active
        ...(filterClass ? { system: filterClass.evaluationSystem } : {}),
      },
      orderBy: [{ system: "asc" }, { order: "asc" }],
    }),
    prisma.exam.findMany({ where: { lesson: { class: { schoolId } } } }), // V03
  ]);

  // Construction de la query de base
  const query: Prisma.ResultWhereInput = {};

  // Filtres basés sur l'interface utilisateur
  // W03 — l'appartenance à une classe passe par l'Enrollment
  if (searchParams.classId) {
    query.student = {
      enrollments: { some: { classId: parseInt(searchParams.classId) } },
    };
  }

  if (role === "student") {
    query.student = { id: userId };
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
      enrollments: { some: { classId: parseInt(searchParams.classId) } },
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

  // Si le rôle est "parent", ne voir que les résultats de ses enfants.
  // W05 — enfants via StudentGuardian, et UNIQUEMENT ceux pour lesquels le
  // tuteur a le droit de consulter les notes (canViewGrades, §2.2.3).
  if (role === "parent") {
    const children = await prisma.studentGuardian.findMany({
      where: { parentId: userId, canViewGrades: true },
      select: { studentId: true },
    });
    const childrenIds = children.map((child) => child.studentId);
    if (query.student) {
      query.student = {
        AND: [query.student, { id: { in: childrenIds } }],
      };
    } else {
      query.student = { id: { in: childrenIds } };
    }
  }

  // Pour le calcul des moyennes, on clone la query et on exclut le filtre sur l'examen
  const averagesQuery = { ...query };
  delete averagesQuery.examId;

  // Modifier la requête pour inclure classScore
  const [data, count, averages] = await prisma.$transaction([
    prisma.result.findMany({
      where: {
        AND: [{ student: { schoolId } }, query], // V03 — cloisonnement
        examId: searchParams.examId ? parseInt(searchParams.examId) : undefined,
      },
      include: {
        exam: { select: { id: true, title: true } },
        // W03 — schoolYearId de la période pour retrouver l'inscription
        semester: { select: { id: true, name: true, schoolYearId: true } },
        subject: { select: { id: true, name: true } },
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            surname: true,
            enrollments: {
              select: {
                schoolYearId: true,
                classId: true,
                class: { select: { name: true } },
              },
            },
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
        AND: [{ student: { schoolId } }, query], // V03 — cloisonnement
        examId: searchParams.examId ? parseInt(searchParams.examId) : undefined,
      },
    }),
    prisma.result.groupBy({
      by: ["studentId", "semesterId"],
      _avg: { score: true },
      where: { AND: [{ student: { schoolId } }, averagesQuery] },
      orderBy: { studentId: "asc" },
    }),
  ]);

  if (!data || !role) return notFound();

  // Association de la moyenne calculée à chaque résultat
  const processedData: ResultList[] = data.map((result) => {
    const avgEntry = averages.find(
      (a) =>
        a.studentId === result.studentId && a.semesterId === result.semesterId
    );
    const classScore = result.classScore ?? 0; // Récupérer classScore
    const score = result.score ?? 0; // Récupérer score
    const moyenne = classScore * 0.4 + score * 0.6; // Calculer la nouvelle moyenne

    // W03 — classe de l'élève = inscription sur l'année de la période du résultat
    const enrollment = result.student.enrollments.find(
      (e) => e.schoolYearId === result.semester.schoolYearId
    );

    return {
      ...result,
      semester: { id: result.semester.id, name: result.semester.name },
      student: {
        id: result.student.id,
        name: result.student.name,
        username: result.student.username,
        surname: result.student.surname,
        classId: enrollment?.classId ?? null,
        class: { name: enrollment?.class.name ?? "-" },
      },
      moyenne: moyenne,
    };
  });

  const count2 = averages.length;

  // S13 — Préchargement des ReportCardData des lignes affichées (bulletin PDF).
  // Un seul calcul par couple (classe, semestre) visible — pas de N+1 par élève —
  // chaque calcul chargeant TOUS les Results de la classe en une requête.
  const groups = new Map<string, { classId: number; semesterId: number }>();
  for (const r of processedData) {
    // W03 — les lignes sans inscription (classId null) n'ont pas de bulletin
    if (r.student.classId == null) continue;
    groups.set(`${r.student.classId}:${r.semesterId}`, {
      classId: r.student.classId,
      semesterId: r.semesterId,
    });
  }
  const reportCards: Record<string, ReportCardData> = {};
  for (const { classId, semesterId } of groups.values()) {
    const cards = await buildClassReportCards(classId, semesterId);
    for (const r of processedData) {
      if (r.student.classId === classId && r.semesterId === semesterId) {
        const card = cards.get(r.studentId);
        if (card) reportCards[`${r.studentId}:${r.semesterId}`] = card;
      }
    }
  }

  // W08 — bulletins périmés (§2.1.6) : lignes dont le ResultAverage est stale
  // (coefficient corrigé après calcul) → badge « À régénérer » dans le tableau.
  const staleRows =
    processedData.length > 0
      ? await prisma.resultAverage.findMany({
          where: {
            stale: true,
            OR: processedData.map((r) => ({
              studentId: r.studentId,
              semesterId: r.semesterId,
            })),
          },
          select: { studentId: true, semesterId: true },
        })
      : [];
  const staleKeys = staleRows.map((r) => `${r.studentId}:${r.semesterId}`);

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
            {(role === "admin" || role === "director" || role === "teacher") && (
              <FormContainer table="result" type="create" />
            )}
          </div>
        </div>
      </div>

      <ResultTable
        data={processedData}
        role={role}
        reportCards={reportCards}
        staleKeys={staleKeys}
      />

      <Pagination page={page} count={count2} />
    </div>
  );
}
