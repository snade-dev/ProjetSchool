"use server";

import { observationSchema, ObservationSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { auditDiff, auditWithSession } from "../audit";
import { notifyGuardians } from "../notify";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from "../actionErrors";

/**
 * W15 — Observations & discipline (§2.3.7).
 *
 * Règles d'autorisation :
 * - un TEACHER n'observe que les élèves de SES classes (une Lesson à lui sur
 *   la classe de l'inscription de l'année ACTIVE de l'élève) ;
 * - supervisor / director / admin : tous les élèves de LEUR école ;
 * - update / delete : l'AUTEUR de l'observation, ou admin/director de l'école.
 * Confidentialité (§2.7.8) : sharedWithParents=false → jamais montrée au
 * parent ni à l'élève (filtré dans les pages) et jamais notifiée.
 * Notification (W12) : une observation NÉGATIVE partagée notifie les tuteurs
 * (type OBSERVATION) à la création.
 */

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const AUTHOR_ROLES = ["admin", "director", "supervisor", "teacher"];

/** L'élève est dans l'école ; un teacher doit l'avoir dans une de ses classes. */
async function checkStudent(
  session: { userId: string; role: string; schoolId: number },
  studentId: string
): Promise<string | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!student) return "Élève introuvable dans votre établissement.";

  if (session.role === "teacher") {
    // W03 — la classe de l'élève = son inscription sur l'année active ;
    // le teacher doit y donner au moins une Lesson.
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolYear: { isActive: true },
        class: { lessons: { some: { teacherId: session.userId } } },
      },
      select: { id: true },
    });
    if (!enrollment) {
      return "Vous ne pouvez enregistrer une observation que pour les élèves de vos classes.";
    }
  }
  return null;
}

export const createObservation = async (
  currentState: CurrentState,
  data: ObservationSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(AUTHOR_ROLES);

    const parsed = observationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const { studentId, kind, content, sharedWithParents } = parsed.data;

    const refusal = await checkStudent(session, studentId);
    if (refusal) return { success: false, error: true, message: refusal };

    const observation = await prisma.observation.create({
      data: {
        studentId,
        authorId: session.userId, // auteur (User.id — signature §2.3.7)
        kind,
        content,
        sharedWithParents,
        schoolId: session.schoolId,
      },
      include: { student: { select: { name: true, surname: true } } },
    });

    // W10 — journal d'audit
    await auditWithSession(
      session,
      "observation.create",
      `Observation#${observation.id}`,
      { after: { studentId, kind, sharedWithParents } }
    );

    // W12 — une observation NÉGATIVE partagée notifie les tuteurs (§2.3.7).
    // Jamais pour une observation confidentielle (sharedWithParents=false).
    if (sharedWithParents && kind === "NEGATIVE") {
      await notifyGuardians([studentId], {
        schoolId: session.schoolId,
        type: "OBSERVATION",
        title: "Nouvelle observation",
        body: `Une observation négative a été enregistrée pour ${observation.student.name} ${observation.student.surname}.`,
        link: `/list/students/${studentId}`,
      });
    }

    revalidatePath("/list/observations");
    revalidatePath(`/list/students/${studentId}`);
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur createObservation:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'enregistrement de l'observation.",
    };
  }
};

export const updateObservation = async (
  currentState: CurrentState,
  data: ObservationSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(AUTHOR_ROLES);

    const parsed = observationSchema.safeParse(data);
    if (!parsed.success || !parsed.data.id) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const { id, studentId, kind, content, sharedWithParents } = parsed.data;

    // L'observation doit exister dans l'école ; modification réservée à
    // l'auteur, ou à admin/director.
    const existing = await prisma.observation.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) {
      return { success: false, error: true, message: "Observation introuvable." };
    }
    if (
      existing.authorId !== session.userId &&
      !["admin", "director"].includes(session.role)
    ) {
      return {
        success: false,
        error: true,
        message: "Vous ne pouvez modifier que vos propres observations.",
      };
    }
    // L'élève n'est pas modifiable (l'observation reste dans SON dossier).
    if (studentId !== existing.studentId) {
      return {
        success: false,
        error: true,
        message: "L'élève d'une observation ne peut pas être changé.",
      };
    }

    await prisma.observation.update({
      where: { id },
      data: { kind, content, sharedWithParents },
    });

    // W10 — audit compact (champs modifiés uniquement)
    const diff = auditDiff(
      {
        kind: existing.kind,
        content: existing.content,
        sharedWithParents: existing.sharedWithParents,
      },
      { kind, content, sharedWithParents }
    );
    if (diff.changed) {
      await auditWithSession(session, "observation.update", `Observation#${id}`, {
        before: diff.before,
        after: diff.after,
      });
    }

    revalidatePath("/list/observations");
    revalidatePath(`/list/students/${existing.studentId}`);
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur updateObservation:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la modification de l'observation.",
    };
  }
};

export const deleteObservation = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = parseInt(data.get("id") as string);
  try {
    const session = await requireSchool(AUTHOR_ROLES);

    const existing = await prisma.observation.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) {
      return { success: false, error: true, message: "Observation introuvable." };
    }
    if (
      existing.authorId !== session.userId &&
      !["admin", "director"].includes(session.role)
    ) {
      return {
        success: false,
        error: true,
        message: "Vous ne pouvez supprimer que vos propres observations.",
      };
    }

    await prisma.observation.delete({ where: { id } });

    await auditWithSession(session, "observation.delete", `Observation#${id}`, {
      before: {
        studentId: existing.studentId,
        kind: existing.kind,
        sharedWithParents: existing.sharedWithParents,
        createdAt: existing.createdAt.toISOString(),
      },
    });

    revalidatePath("/list/observations");
    revalidatePath(`/list/students/${existing.studentId}`);
    return { success: true, error: false };
  } catch (err: any) {
    console.error("Erreur deleteObservation:", err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
