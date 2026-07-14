"use server";

import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import type { ResultRow } from "./types";

export async function renderResultActions(item: any, role: string) {
  if (role === "admin" || role === "teacher") {
    return (
      <>
        <FormContainer table="result" type="update" data={item} />
        <FormContainer table="result" type="delete" id={item.id} />
      </>
    );
  }
  return null;
}

export const getResults = async (
  studentId: string,
  semesterId: number
): Promise<ResultRow[]> => {
  // W03 — classe de l'élève = son inscription sur l'année de la période
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    select: { schoolYearId: true },
  });
  const enrollment = semester
    ? await prisma.enrollment.findUnique({
        where: {
          studentId_schoolYearId: {
            studentId,
            schoolYearId: semester.schoolYearId,
          },
        },
        select: { classId: true, class: { select: { name: true } } },
      })
    : null;

  const results = await prisma.result.findMany({
    where: { studentId, semesterId },
    include: {
      makeupExam: { select: { score: true } },
      exam: { select: { id: true, title: true } },
      semester: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          name: true,
          username: true,
          surname: true,
        },
      },
    },
    orderBy: {
      student: { name: "asc" },
    },
  });

  const processedResults: ResultRow[] = results.map((result) => {
    // Récupère le score du makeupExam s'il existe
    const makeupScore = result.makeupExam?.score;
    return {
      ...result,
      score:
        makeupScore != null && makeupScore > result.score
          ? makeupScore
          : result.score,
      student: {
        ...result.student,
        classId: enrollment?.classId ?? null,
        class: { name: enrollment?.class.name ?? "-" },
      },
    };
  });

  return processedResults;
};
