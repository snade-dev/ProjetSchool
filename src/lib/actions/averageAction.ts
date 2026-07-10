"use server";

import { ResultMSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole } from '../authGuard';
import { revalidatePath } from 'next/cache';
import { deleteErrorMessage } from '../actionErrors';


type CurrentState = {
    success: boolean,
    error: boolean
}
type CurrentState2 = {
    success: boolean,
    error: boolean,
    message: string
}



export const createAverage = async (
    currentState: CurrentState2,
    data: ResultMSchema
  ) => {
    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername}
    })

    if (!student) {
      return { success: false, error: true, message: "L'etudiant n'existe pas" };

    }

    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      if (role === "teacher") {
        const teacherExam = await prisma.exam.findFirst({
          where: { id: data.examId, lesson: { teacherId: userId } },
        });
        if (!teacherExam) {
          return { success: false, error: true, message: "" };
        }
      }

      await prisma.examAverage.create({
        data: {
          average: data.average,
          examId: data.examId,
          studentId: student.id,
        },
      });

      revalidatePath("/list/average");
      return { success: true, error: false ,message: "" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "" };
    }
  };
  
  export const updateAverage = async (
    currentState: CurrentState2,
    data: ResultMSchema
  ) => {
    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      if (role === "teacher") {
        const teacherExam = await prisma.exam.findFirst({
          where: { id: data.examId, lesson: { teacherId: userId } },
        });
        if (!teacherExam) {
          return { success: false, error: true, message: "" };
        }
      }

    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername}
    })

    if (!student) {
      return { success: false, error: true, message: "" };

    }

      await prisma.examAverage.update({
        where: {
          id: data.id,
        },
        data: {
          average: data.average,
          examId: data.examId,
          studentId: student.id,
        },
      });

      revalidatePath("/list/average");
      return { success: true, error: false, message:"" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message:"" };
    }
  };
  
  export const deleteAverage = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;

    try {
      await requireRole(["admin"]);
      await prisma.examAverage.delete({
        where: {
          id: parseInt(id),
        },
      });

      revalidatePath("/list/average");
      return { success: true, error: false };
    } catch (err: any) {
      console.log(err);
      return { success: false, error: true, message: deleteErrorMessage(err) };
    }
  };