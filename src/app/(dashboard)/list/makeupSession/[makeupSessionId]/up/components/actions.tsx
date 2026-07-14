"use server";

import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import type { MakeupExamRow } from "./types";

export async function renderResultActions(item: any, role: string) {
  if (role === "admin" || role === "director" || role === "teacher") {
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
  sessionId: string
): Promise<MakeupExamRow[]> => {
  // W03 — classe de l'élève = son inscription sur l'année de la période de la session
  const makeupSession = await prisma.makeupSession.findUnique({
    where: { id: sessionId },
    select: { semester: { select: { schoolYearId: true } } },
  });
  const enrollment = makeupSession
    ? await prisma.enrollment.findUnique({
        where: {
          studentId_schoolYearId: {
            studentId,
            schoolYearId: makeupSession.semester.schoolYearId,
          },
        },
        select: { classId: true, class: { select: { name: true } } },
      })
    : null;

  const results = await prisma.makeupExam.findMany({
    where: { studentId, sessionId },
    include: {
      subject: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      student: {
        name: "asc",
      },
    },
  });

  return results.map((r) => ({
    ...r,
    student: {
      ...r.student,
      classId: enrollment?.classId ?? null,
      class: { name: enrollment?.class.name ?? "-" },
    },
  }));
};
