"use server";

import { LessonSchema } from '../formsValidationSchema';
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

// Lesson
export const createLesson = async (currentState: CurrentState2 ,data: LessonSchema) => {

    try {
        await requireRole(["admin"]);

        const existingLesson = await prisma.lesson.findFirst({
          where: {
            OR: [
              { name: data.name},
            ]
          }
        });

        // Déterminer le champ dupliqué pour un message d'erreur spécifique
    if (existingLesson) {
      if (existingLesson.name === data.name) {
        return { success: false, error: true, message: "La lessons  existe déjà." };
      }
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        username: data.teacherUsername
      }
    })

    if (!teacher) {
      return {success: false, error: true, message: "L'enseignant n'existe pas."}
    }
        
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        subjectId: Number(data.subjectId),
        classId: Number(data.classId),
        teacherId: teacher.id
      },
    });



        revalidatePath("/list/lessons");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const updateLesson = async (currentState: CurrentState2 ,data: LessonSchema) => {
    try {
      await requireRole(["admin"]);

      if (!data.id) {
        return {success: false, error: true, message: ""}
      }

      const teacher = await prisma.teacher.findUnique({
        where: {
          username: data.teacherUsername
        }
      })
  
      if (!teacher) {
        return {success: false, error: true, message: "L'enseignant n'existe pas."}
      }


      await prisma.lesson.update({
        where: {
          id: data.id
        },
        data: {
        name: data.name,
        day: data.day,
        subjectId: Number(data.subjectId),
        classId: Number(data.classId),
        teacherId: teacher.id
        },
      });

        revalidatePath("/list/lessons");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const deleteLesson = async (currentState: CurrentState ,data: FormData) => {
    const id = Number(data.get("id") as unknown);
    try {
      await requireRole(["admin"]);

      try {
        await prisma.lesson.delete({
          where: {
            id: id
          }
        });
    } catch (clerkError) {
        console.warn(`Utilisateur avec l'id ${id} introuvable dans Clerk. Suppression ignorée dans Clerk.`);
    }


        revalidatePath("/list/lessons");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }

}
