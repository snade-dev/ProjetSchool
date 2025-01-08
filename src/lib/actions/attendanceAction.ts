"use server";

import { Attendancechema } from '../formsValidationSchema';
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



export const createAttendance = async (
    currentState: CurrentState2,
    data: Attendancechema
  ) => {
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {

      const student = await prisma.student.findUnique({
        where: {
          username: data.studentUsername
        }
      })

      if (!student) {
        return { success: false, error: true, message: "Ce etudiant n'existe pas" };
      }
  
      await prisma.attendance.create({
        data: {
          date: data.date,
          present:data.present === "true",
          studentId: student?.id,
          subjectId: data.subjectId,
          classId: data.classId
        },
      });
  
      // revalidatePath("/list/subjects");
      return { success: true, error: false, message: "" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const updateAttendance = async (
    currentState: CurrentState2,
    data: Attendancechema
  ) => {
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      const student = await prisma.student.findUnique({
        where: {
          username: data.studentUsername
        }
      })

      if (!student) {
        return { success: false, error: true, message: "Ce etudiant n'existe pas" };
      }
  
      await prisma.attendance.update({
        where: {
          id: data.id,
        },
        data: {
          date: data.date,
          present:  data.present === "true",
          studentId: student?.id,
          subjectId: data.subjectId,
          classId: data.classId
        },
      });
  
      // revalidatePath("/list/subjects");
      return { success: false, error: true, message: "Une erreur c'est produite" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };
  
  export const deleteAttendance = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;
  
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
  
    try {
      await prisma.attendance.delete({
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