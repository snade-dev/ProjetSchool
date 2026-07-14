"use server";

import { AnnounceSchema, EventSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole, requireSchool } from "../authGuard";
import { announcementAudience, notify } from '../notify';
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



export const createEvent = async (
    currentState: CurrentState,
    data: EventSchema
  ) => {
    try {
      const { schoolId } = await requireSchool(["admin", "director"]); // V03

      await prisma.event.create({
        data: {
          schoolId,
          title: data.title,
          description: "",
          startTime:data.startTime,
          endTime : data.endTime,
          classId: data.classId,
        },
      });

      // W12 — même logique que les annonces : classe → élèves + tuteurs +
      // prof principal ; sans classe → tous les comptes de l'école.
      await notify(await announcementAudience(schoolId, data.classId), {
        schoolId,
        type: "ANNOUNCEMENT",
        title: "Nouvel événement",
        body: `${data.title} — le ${data.startTime.toLocaleDateString("fr-FR")}.`,
        link: "/list/events",
      });

      revalidatePath("/list/events");
      return { success: true, error: false };
    } catch (err) {
      console.log(err);
      return { success: false, error: true };
    }
  };
  
  export const updateEvent = async (
    currentState: CurrentState,
    data: EventSchema
  ) => {
    try {
      await requireRole(["admin", "director"]);

      await prisma.event.update({
        where: {
          id: data.id,
        },
        data: {
            title: data.title,
            description: data.description,
            startTime:data.startTime,
            endTime : data.endTime,
            classId: data.classId,
         
          },
      });

      revalidatePath("/list/events");
      return { success: true, error: false };
    } catch (err) {
      console.log(err);
      return { success: false, error: true };
    }
  };

  export const deleteEvent = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;

    try {
      await requireRole(["admin", "director"]);
      await prisma.event.delete({
        where: {
          id: parseInt(id),
        },
      });

      revalidatePath("/list/events");
      return { success: true, error: false };
    } catch (err: any) {
      console.log(err);
      return { success: false, error: true, message: deleteErrorMessage(err) };
    }
  };