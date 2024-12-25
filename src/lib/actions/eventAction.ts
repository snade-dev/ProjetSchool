"use server";

import { AnnounceSchema, EventSchema } from '../formsValidationSchema';
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



export const createEvent = async (
    currentState: CurrentState,
    data: EventSchema
  ) => {
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
  
      await prisma.event.create({
        data: {
          title: data.title,
          description: "",
          startTime:data.startTime,
          endTime : data.endTime,
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
  
  export const updateEvent = async (
    currentState: CurrentState,
    data: EventSchema
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
  
      // revalidatePath("/list/subjects");
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
  
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      await prisma.event.delete({
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