"use server";

import { AnnounceSchema } from '../formsValidationSchema';
import prisma from '../prisma';


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
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
  
      await prisma.announcement.create({
        data: {
          title: data.title,
          date: data.date,
          description: "",
          classId: data.classId,
        },
      });
  
      // revalidatePath("/list/subjects");
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
  
      // revalidatePath("/list/subjects");
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
  
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      await prisma.announcement.delete({
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