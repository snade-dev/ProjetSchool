"use server";

import { AnnounceSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole, requireSchool } from "../authGuard";
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



export const createAnnounce = async (
    currentState: CurrentState,
    data: AnnounceSchema
  ) => {
    try {
      const { schoolId } = await requireSchool(["admin"]); // V03

      await prisma.announcement.create({
        data: {
          schoolId,
          title: data.title,
          date: data.date,
          description: "",
          classId: data.classId,
        },
      });

      revalidatePath("/list/announcements");
      return { success: true, error: false };
    } catch (err) {
      console.log(err);
      return { success: false, error: true };
    }
  };
  
  export const updateAnnounce = async (
    currentState: CurrentState,
    data: AnnounceSchema
  ) => {
    try {
      await requireRole(["admin"]);

      await prisma.announcement.update({
        where: {
          id: data.id,
        },
        data: {
            title: data.title,
            date: data.date,
            description: data.description,
            classId: data.classId,
          },
      });

      revalidatePath("/list/announcements");
      return { success: true, error: false };
    } catch (err) {
      console.log(err);
      return { success: false, error: true };
    }
  };

  export const deleteAnnounce = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;

    try {
      await requireRole(["admin"]);
      await prisma.announcement.delete({
        where: {
          id: parseInt(id),
        },
      });

      revalidatePath("/list/announcements");
      return { success: true, error: false };
    } catch (err: any) {
      console.log(err);
      return { success: false, error: true, message: deleteErrorMessage(err) };
    }
  };