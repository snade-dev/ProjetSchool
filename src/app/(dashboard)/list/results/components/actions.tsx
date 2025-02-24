"use server";

import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Dispatch, SetStateAction } from "react";

type ResultWithDetails = Prisma.ResultGetPayload<{
  include: {
    exam: { select: { id: true; title: true } };
    semester: { select: { id: true; name: true } };
    subject: { select: { id: true; name: true } };
    student: {
      select: {
        id: true;
        name: true;
        classId: true;
        class: { select: { name: true } };
      };
    };
  };
}>;


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




  export const getResults = async (studentId: string, semesterId: number) => {
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
            surname: true,
            classId: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    
    const processedResults = results.map(result => {
      // Récupère le score du makeupExam s'il existe
      const makeupScore = result.makeupExam?.score;
      return {
        ...result,
        score: (makeupScore != null && makeupScore > result.score)
          ? makeupScore
          : result.score,
      };
    });
    
    return processedResults;
    
};