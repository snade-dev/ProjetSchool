"use server";

import { ComplainSchema, ResultMSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole } from '../authGuard';
import { revalidatePath } from 'next/cache';


type CurrentState = {
    success: boolean,
    error: boolean
}
type CurrentState2 = {
    success: boolean,
    error: boolean,
    message: string
}



export const createComplain = async (
    currentState: CurrentState2,
    data: {
      title: string,
      description: string,
      quizId: string,
      studentId:  string
    }
  ) => {


    try {
      const { userId, role } = await requireRole(["admin", "student"]);

      if (role === "student" && data.studentId !== userId) {
        return { success: false, error: true, message: "Accès refusé" };
      }

      await prisma.complaint.create({
        data: {
          title: data.title,
          description: data.description,
          quizId: data.quizId,
          studentId: data.studentId
        },
      });

      revalidatePath("/list/reclamation");
      return { success: true, error: false ,message: "" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "" };
    }
  };

export const updateComplain = async (
    currentState: CurrentState2,
    data: any
  ) => {


    try {
      await requireRole(["admin", "teacher"]);

      await prisma.complaint.update({
        where: {
          id: data.id
        },
        data: {
          ...data
        },
      });

      revalidatePath("/list/reclamation");
      return { success: true, error: false ,message: "reclamation modifier avec success" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "" };
    }
  };