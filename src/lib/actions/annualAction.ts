"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { auditWithSession, auditDiff } from "../audit";
import { AnnualAssessmentSchema } from "../formsValidationSchema";

/**
 * X07 — Bilan de fin d'année d'un élève (§2.3) : conduite, appréciation du
 * travail, décision du conseil des maîtres, observations, retards.
 *
 * Une seule saisie alimente TROIS documents : le bulletin annuel, le certificat
 * de transfert (X08) et l'assistant de passage d'année (W04).
 *
 * Qui saisit : la direction, ou l'enseignant TITULAIRE de la classe
 * (Class.supervisorId) — c'est lui qui signe « Le Maître » sur le bulletin.
 */

type CurrentState = { success: boolean; error: boolean };

export const saveAnnualAssessment = async (
  currentState: CurrentState,
  data: AnnualAssessmentSchema
) => {
  try {
    const session = await requireRole([
      "admin",
      "director",
      "teacher",
      "supervisor",
    ]);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
      select: {
        conduct: true,
        workAppreciation: true,
        annualDecision: true,
        annualObservation: true,
        lateCount: true,
        class: { select: { schoolId: true, supervisorId: true } },
      },
    });
    if (!enrollment || enrollment.class.schoolId !== session.schoolId) {
      return { success: false, error: true };
    }
    // Un enseignant ne renseigne QUE le bilan des classes dont il est titulaire.
    if (
      session.role === "teacher" &&
      enrollment.class.supervisorId !== session.userId
    ) {
      return { success: false, error: true };
    }

    const after = {
      conduct: data.conduct ?? null,
      workAppreciation: data.workAppreciation ?? null,
      annualDecision: data.annualDecision || null,
      annualObservation: data.annualObservation || null,
      lateCount: data.lateCount ?? null,
    };

    await prisma.enrollment.update({
      where: { id: data.enrollmentId },
      data: after,
    });

    const diff = auditDiff(
      enrollment as unknown as Record<string, unknown>,
      after
    );
    if (diff.changed) {
      await auditWithSession(
        session,
        "annual.assessment",
        `Enrollment#${data.enrollmentId}`,
        {
          before: diff.before,
          after: diff.after,
          schoolId: enrollment.class.schoolId,
        }
      );
    }

    revalidatePath("/list/annual");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
