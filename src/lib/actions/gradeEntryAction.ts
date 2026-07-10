"use server";

import { gradeEntrySchema, GradeEntrySchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";

type State = {
  success: boolean;
  error: boolean;
  message: string;
};

/**
 * S12 — Enregistrement en masse des notes d'une classe pour une (matière, semestre).
 *
 * - `requireRole(["admin","teacher"])` ; un teacher ne peut noter qu'une (classe, matière)
 *   qu'il enseigne (vérif Lesson) — résout H23 (ownership granulaire des updates en masse).
 * - TOUT le payload est validé par zod AVANT toute écriture (atomicité logique) : une note
 *   hors [0;20] rejette l'ensemble, rien n'est écrit.
 * - `Result.score` est `Int` NON NUL : une ligne n'est upsertée que si `score` est présent ;
 *   les lignes sans note d'examen sont ignorées (aucun delete — cf. story-12 parade).
 * - `$transaction` interactive (forme H30, compatible Accelerate + timeout) d'upserts sur la
 *   clé unique `@@unique([semesterId, studentId, subjectId])`.
 */
export async function saveGrades(
  currentState: State,
  data: GradeEntrySchema
): Promise<State> {
  try {
    const { userId, role } = await requireRole(["admin", "teacher"]);

    // Validation intégrale du payload AVANT toute écriture.
    const parsed = gradeEntrySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: "Données invalides : certaines notes sont hors de l'intervalle [0;20].",
      };
    }

    const { classId, subjectId, semesterId, grades } = parsed.data;

    // Ownership enseignant : la (classe, matière) doit correspondre à une de ses Lessons.
    if (role === "teacher") {
      const lesson = await prisma.lesson.findFirst({
        where: { classId, subjectId, teacherId: userId },
      });
      if (!lesson) {
        return {
          success: false,
          error: true,
          message: "Vous ne pouvez saisir des notes que pour vos matières.",
        };
      }
    }

    // Result.score est Int non nul : seules les lignes avec une note d'examen sont écrites.
    const toUpsert = grades.filter(
      (g) => g.score !== undefined && g.score !== null
    );

    await prisma.$transaction(
      async (tx) => {
        for (const g of toUpsert) {
          await tx.result.upsert({
            where: {
              semesterId_studentId_subjectId: {
                semesterId,
                studentId: g.studentId,
                subjectId,
              },
            },
            create: {
              semesterId,
              studentId: g.studentId,
              subjectId,
              score: g.score as number,
              classScore: g.classScore ?? null,
            },
            update: {
              score: g.score as number,
              classScore: g.classScore ?? null,
            },
          });
        }
      },
      { timeout: 30000 }
    );

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    revalidatePath("/list/gradeEntry");

    return {
      success: true,
      error: false,
      message: `${toUpsert.length} note(s) enregistrée(s) avec succès.`,
    };
  } catch (err) {
    console.error("Erreur saveGrades:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'enregistrement des notes.",
    };
  }
}
