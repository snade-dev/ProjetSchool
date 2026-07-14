"use server";

import { gradeEntrySchema, GradeEntrySchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession } from "../audit";
import { createNotifications } from "../notify";
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
    const { userId, role } = await requireRole(["admin", "director", "teacher"]);
  // V03 — la classe visée doit appartenir à l'école de la session
  const sessionG = await requireSchool(["admin", "director", "teacher"]);
  const { schoolId: sidG } = sessionG;
  const classInSchool = await prisma.class.findFirst({
    where: { id: data.classId, schoolId: sidG }, select: { id: true },
  });
  if (!classInSchool) return { success: false, error: true, message: "Classe introuvable dans votre établissement." };

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

    // W10 — journal d'audit : saisie en masse = UNE entrée résumé (§2.11.2)
    if (toUpsert.length > 0) {
      await auditWithSession(sessionG, "note.bulkSave", `Class#${classId}`, {
        after: {
          classId,
          subjectId,
          semesterId,
          notesEnregistrees: toUpsert.length,
        },
      });
    }

    // W12 — UNE notification par élève noté (jamais une par note) :
    // « Notes de {matière} publiées » → élève + tuteurs canViewGrades.
    try {
      const studentIds = [...new Set(toUpsert.map((g) => g.studentId))];
      if (studentIds.length > 0) {
        const [subject, semester, guardians] = await Promise.all([
          prisma.subject.findUnique({
            where: { id: subjectId },
            select: { name: true },
          }),
          prisma.semester.findUnique({
            where: { id: semesterId },
            select: { name: true, label: true },
          }),
          prisma.studentGuardian.findMany({
            where: { studentId: { in: studentIds }, canViewGrades: true },
            select: { studentId: true, parentId: true },
          }),
        ]);
        const body = `Notes de ${subject?.name ?? "matière"} publiées (${
          semester?.label ?? semester?.name ?? "période"
        }).`;
        await createNotifications(
          studentIds.flatMap((studentId) =>
            [
              studentId,
              ...guardians
                .filter((g) => g.studentId === studentId)
                .map((g) => g.parentId),
            ].map((userId) => ({
              userId,
              schoolId: sidG,
              type: "GRADE" as const,
              title: "Notes",
              body,
              link: "/list/exams?tab=results",
            }))
          )
        );
      }
    } catch (err) {
      console.error("[notify] saisie de notes non notifiée:", err);
    }

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
