"use server";

import {  MakeupSessionSchema } from '../formsValidationSchema';
import prisma from '../prisma';


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
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      console.log("userId", data.userId);
      
  
      await prisma.makeupSession.create({
        data: {
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          semesterId: parseInt(data.semesterId),
          createdById: data.userId,
        },
      });
  
      // revalidatePath("/list/subjects");
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
  
      // revalidatePath("/list/subjects");
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
  
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      await prisma.makeupSession.delete({
        where: {
          id: id,
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