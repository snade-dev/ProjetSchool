"use server";

import { ComplainSchema, ResultMSchema } from '../formsValidationSchema';
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
  
      await prisma.complaint.create({
        data: {
          title: data.title,
          description: data.description,
          quizId: data.quizId,
          studentId: data.studentId
        },
      });
  
      // revalidatePath("/list/subjects");
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
  
      await prisma.complaint.update({
        where: {
          id: data.id
        },
        data: {
          ...data
        },
      });
  
      // revalidatePath("/list/subjects");
      return { success: true, error: false ,message: "reclamation modifier avec success" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "" };
    }
  };
  
  
  // export const deleteAverage = async (
  //   currentState: CurrentState,
  //   data: FormData
  // ) => {
  //   const id = data.get("id") as string;
  
  //   // const { userId, sessionClaims } = auth();
  //   // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  //   try {
  //     await prisma.examAverage.delete({
  //       where: {
  //         id: parseInt(id),
  //         // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
  //       },
  //     });
  
  //     // revalidatePath("/list/subjects");
  //     return { success: true, error: false };
  //   } catch (err) {
  //     console.log(err);
  //     return { success: false, error: true };
  //   }
  // };