"use server";

import { ResultMSchema } from '../formsValidationSchema';
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



export const createAverage = async (
    currentState: CurrentState2,
    data: ResultMSchema
  ) => {
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;

    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername}
    })

    if (!student) {
      return { success: false, error: true, message: "L'etudiant n'existe pas" };

    }
  
    try {
  
      await prisma.examAverage.create({
        data: {
          average: data.average,
          examId: data.examId,
          studentId: student.id,
        },
      });
  
      // revalidatePath("/list/subjects");
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
  
      // revalidatePath("/list/subjects");
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
  
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      await prisma.examAverage.delete({
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