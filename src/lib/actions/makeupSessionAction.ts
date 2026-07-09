"use server";

import {  MakeupSessionSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole } from '../authGuard';
import { revalidatePath } from 'next/cache';


type CurrentState = {
    success: boolean,
    error: boolean,
}
type CurrentState2 = {
    success: boolean,
    error: boolean,
    message: string
}



export const createMakeupSession = async (
    currentState: CurrentState2,
    data: {
      userId: string;
      title: string;
    startTime: Date;
    endTime: Date;
    semesterId: string;
    id?: string | undefined;
    }
  ) => {
    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      if (role === "teacher" && data.userId !== userId) {
        return { success: false, error: true, message: "Accès refusé" };
      }

      await prisma.makeupSession.create({
        data: {
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          semesterId: parseInt(data.semesterId),
          createdById: data.userId,
        },
      });
  
      revalidatePath("/list/makeupSession");
      return { success: true, error: false, message: "Session de rattrapage créée avec succès" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const updateMakeupSession = async (
    currentState: CurrentState,
    data: MakeupSessionSchema
  ) => {
    try {
      await requireRole(["admin", "teacher"]);

      await prisma.makeupSession.update({
        where: {
          id: data.id,
        },
        data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            semesterId: parseInt(data.semesterId),
          },
      });

      revalidatePath("/list/makeupSession");
      return { success: true, error: false, message: "Session de rattrapage modifiée avec succès" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const deleteMakeupSession = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;

    try {
      await requireRole(["admin"]);
      await prisma.makeupSession.delete({
        where: {
          id: id,
        },
      });

      revalidatePath("/list/makeupSession");
      return { success: true, error: false };
    } catch (err) {
      console.log(err);
      return { success: false, error: true };
    }
  };