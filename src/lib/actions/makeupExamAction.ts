"use server";

import { MakeupExamFormSchema, MakeupExamSchema, MakeupSessionSchema, makeupExamFormSchema } from '../formsValidationSchema';
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



export const createMakeupExam = async (
    currentState: CurrentState2,
    data: { 
      userId: string;
      subjectId: number;
      sessionId: string;
      semesterId: number;
      id?: string | undefined;
    }
  ) => {
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {

      const result = await prisma.result.findUnique({
        where: {
          semesterId_studentId_subjectId: {
            semesterId: data.semesterId,
            studentId: data.userId,
            subjectId: data.subjectId,
          }
        }
      })
      
      if (!result) {
        return { success: false, error: true, message: "resultats introuvable" };

      }
  
      await prisma.makeupExam.create({
        data: {
          resultId: result.id,
          studentId: data.userId,
          subjectId: data.subjectId,
          sessionId: data.sessionId,
        },
      });
  
      // revalidatePath("/list/subjects");
      return { success: true, error: false, message: "L'inscription à l'examen de rattrapage a été effectuée avec succès" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const updateMakeupExam = async (
    currentState: CurrentState,
    data: MakeupExamFormSchema
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
  
        // Mise à jour en transaction de tous les résultats
  await prisma.$transaction(
    data.results.map(({ id, score }) =>
      prisma.makeupExam.update({
        where: { id },
        data: { score },
      })
    )
  );
  
      // revalidatePath("/list/subjects");
      return { success: true, error: false, message: "Session de rattrapage modifiée avec succès" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const deleteMakeupExam = async (
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