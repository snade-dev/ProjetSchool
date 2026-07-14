"use server";

import { Attendancechema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole } from '../authGuard';
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



export const createAttendance = async (
    currentState: CurrentState2,
    data: Attendancechema
  ) => {
    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      if (role === "teacher") {
        const teacherLesson = await prisma.lesson.findFirst({
          where: {
            teacherId: userId,
            classId: data.classId,
            subjectId: data.subjectId,
          },
        });
        if (!teacherLesson) {
          return { success: false, error: true, message: "Accès refusé" };
        }
      }

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

      revalidatePath("/list/attendances");
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
    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      if (role === "teacher") {
        const teacherLesson = await prisma.lesson.findFirst({
          where: {
            teacherId: userId,
            classId: data.classId,
            subjectId: data.subjectId,
          },
        });
        if (!teacherLesson) {
          return { success: false, error: true, message: "Accès refusé" };
        }
      }

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
  
      revalidatePath("/list/attendances");
      // H22 corrigé : le succès renvoie bien success:true (l'ancien retour était erroné)
      return { success: true, error: false, message: "" };
    } catch (err) {
      console.log(err);
      return { success: false, error: true, message: "Une erreur c'est produite" };
    }
  };

  /**
   * Feuille d'appel (refonte présence) : enregistre la présence de TOUTE une
   * classe pour (date, session, matière) en un seul envoi.
   * - admin/teacher ; un teacher ne peut pointer qu'une (classe, matière)
   *   qu'il enseigne (vérif Lesson, même règle que saveGrades S12).
   * - Idempotent : si un pointage existe déjà pour (élève, jour, session,
   *   matière), il est mis à jour au lieu d'être dupliqué.
   */
  export const saveRollCall = async (
    currentState: CurrentState2,
    data: {
      classId: number;
      subjectId: number;
      date: string; // "yyyy-MM-dd"
      sessionDay: "MORNING" | "EVENING";
      entries: { studentId: string; present: boolean }[];
    }
  ): Promise<CurrentState2> => {
    try {
      const { userId, role } = await requireRole(["admin", "teacher"]);

      const classId = Number(data.classId);
      const subjectId = Number(data.subjectId);
      const sessionDay = data.sessionDay === "EVENING" ? "EVENING" : "MORNING";
      const day = new Date(`${data.date}T00:00:00`);
      if (
        !Number.isInteger(classId) ||
        !Number.isInteger(subjectId) ||
        Number.isNaN(day.getTime()) ||
        !Array.isArray(data.entries) ||
        data.entries.length === 0
      ) {
        return { success: false, error: true, message: "Données invalides." };
      }

      if (role === "teacher") {
        const teacherLesson = await prisma.lesson.findFirst({
          where: { teacherId: userId, classId, subjectId },
        });
        if (!teacherLesson) {
          return {
            success: false,
            error: true,
            message: "Vous ne pouvez faire l'appel que pour vos classes.",
          };
        }
      }

      // Seuls les élèves de la classe sont acceptés (URL/payload forgés).
      // W03 — élèves de la classe = ses inscriptions (Enrollment)
      const enrolled = await prisma.enrollment.findMany({
        where: { classId },
        select: { studentId: true },
      });
      const allowed = new Set(enrolled.map((e) => e.studentId));
      const entries = data.entries.filter((e) => allowed.has(e.studentId));

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      await prisma.$transaction(
        async (tx) => {
          for (const e of entries) {
            const existing = await tx.attendance.findFirst({
              where: {
                studentId: e.studentId,
                subjectId,
                classId,
                sessionDay,
                date: { gte: day, lt: nextDay },
              },
              select: { id: true },
            });
            if (existing) {
              await tx.attendance.update({
                where: { id: existing.id },
                data: { present: !!e.present },
              });
            } else {
              await tx.attendance.create({
                data: {
                  date: day,
                  present: !!e.present,
                  sessionDay,
                  studentId: e.studentId,
                  subjectId,
                  classId,
                },
              });
            }
          }
        },
        { timeout: 30000 }
      );

      revalidatePath("/list/attendances");
      revalidatePath("/list/attendances/appel");
      return {
        success: true,
        error: false,
        message: `Appel enregistré (${entries.length} élève(s)).`,
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        error: true,
        message: "Erreur lors de l'enregistrement de l'appel.",
      };
    }
  };

  export const deleteAttendance = async (
    currentState: CurrentState,
    data: FormData
  ) => {
    const id = data.get("id") as string;

    try {
      await requireRole(["admin"]);
      await prisma.attendance.delete({
        where: {
          id: parseInt(id),
        },
      });

      revalidatePath("/list/attendances");
      return { success: true, error: false };
    } catch (err: any) {
      console.log(err);
      return { success: false, error: true, message: deleteErrorMessage(err) };
    }
  };