"use server";

import { ResultMSchema, ResultSchema } from "../formsValidationSchema";
import prisma from "../prisma";

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

export const createResult = async (
  currentState: CurrentState2,
  data: ResultSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  const student = await prisma.student.findUnique({
    where: { username: data.studentUsername },
  });

  if (!student) {
    return { success: false, error: true, message: "L'etudiant n'existe pas" };
  }

  const result = await prisma.result.findUnique({
    where: {
      examId_studentId_subjectId: {
        studentId: student.id,
        examId: data.examId,
        subjectId: data.subjectId,
      },
    },
  });

  if (result) {
    return { success: false, error: true, message: "Ce resultat existe déjà" };
  }

  try {
    // if (!data.semesterId) {
    //   throw new Error("semesterId est requis !");
    // }
    await prisma.result.create({
      data: {
        subjectId: data.subjectId,
        score: data.score,
        examId: data.examId,
        studentId: student.id,
        semesterId: data.semesterId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false, message: "" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "" };
  }
};

export const updateResult = async (
  currentState: CurrentState2,
  data: ResultSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername },
    });

    if (!student) {
      return { success: false, error: true, message: "" };
    }

    await prisma.result.update({
      where: {
        id: data.id,
      },
      data: {
        subjectId: data.subjectId,
        score: data.score,
        examId: data.examId,
        studentId: student.id,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false, message: "" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "" };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.result.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
