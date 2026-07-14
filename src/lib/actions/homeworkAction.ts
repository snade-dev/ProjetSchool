"use server";

import { homeworkSchema, HomeworkSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { auditDiff, auditWithSession } from "../audit";
import { homeworkAudience, notify } from "../notify";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from "../actionErrors";

/**
 * W14 — Devoirs à faire (§2.3.8). V1 : publication + consultation UNIQUEMENT
 * (pas de dépôt en ligne ni de correction — explicitement V2).
 *
 * Règles d'autorisation (mêmes principes que la saisie de notes, cf.
 * gradeEntryAction) :
 * - un TEACHER ne publie que pour une (classe, matière) où il enseigne
 *   (une Lesson classe+matière+lui doit exister) ;
 * - admin/director publient pour toute classe de LEUR école ;
 * - update/delete : l'auteur du devoir, ou admin/director de l'école.
 * - la classe ET la matière doivent appartenir à l'école de la session.
 */

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const PUBLISHER_ROLES = ["admin", "director", "teacher"];

/** Vérifie classe + matière dans l'école, et la Lesson du teacher. */
async function checkTarget(
  session: { userId: string; role: string; schoolId: number },
  classId: number,
  subjectId: number
): Promise<string | null> {
  const [klass, subject] = await Promise.all([
    prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true },
    }),
    prisma.subject.findFirst({
      where: { id: subjectId, schoolId: session.schoolId },
      select: { id: true },
    }),
  ]);
  if (!klass) return "Classe introuvable dans votre établissement.";
  if (!subject) return "Matière introuvable dans votre établissement.";

  // Ownership enseignant : même règle que la saisie de notes (gradeEntry).
  if (session.role === "teacher") {
    const lesson = await prisma.lesson.findFirst({
      where: { classId, subjectId, teacherId: session.userId },
      select: { id: true },
    });
    if (!lesson) {
      return "Vous ne pouvez publier un devoir que pour une classe et une matière où vous enseignez.";
    }
  }
  return null;
}

export const createHomework = async (
  currentState: CurrentState,
  data: HomeworkSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(PUBLISHER_ROLES);

    const parsed = homeworkSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const { title, content, dueDate, classId, subjectId, fileUrl } = parsed.data;

    const refusal = await checkTarget(session, classId, subjectId);
    if (refusal) return { success: false, error: true, message: refusal };

    const homework = await prisma.homework.create({
      data: {
        title,
        content,
        dueDate,
        classId,
        subjectId,
        teacherId: session.userId, // auteur (User.id — teacher/admin/director)
        fileUrl: fileUrl || null,
        schoolId: session.schoolId,
      },
      include: { subject: { select: { name: true } }, class: { select: { name: true } } },
    });

    // W10 — journal d'audit
    await auditWithSession(session, "homework.create", `Homework#${homework.id}`, {
      after: { title, classId, subjectId, dueDate: dueDate.toISOString() },
    });

    // W12 — notification HOMEWORK : élèves de la classe + tuteurs (SANS le
    // prof — motif announcementAudience restreint), link vers la liste.
    await notify(await homeworkAudience(classId), {
      schoolId: session.schoolId,
      type: "HOMEWORK",
      title: "Nouveau devoir",
      body: `${homework.subject.name} (${homework.class.name}) : ${title} — à rendre le ${new Intl.DateTimeFormat("fr-FR").format(dueDate)}.`,
      link: "/list/homeworks",
    });

    revalidatePath("/list/homeworks");
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur createHomework:", err);
    return { success: false, error: true, message: "Erreur lors de la publication du devoir." };
  }
};

export const updateHomework = async (
  currentState: CurrentState,
  data: HomeworkSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(PUBLISHER_ROLES);

    const parsed = homeworkSchema.safeParse(data);
    if (!parsed.success || !parsed.data.id) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const { id, title, content, dueDate, classId, subjectId, fileUrl } = parsed.data;

    // Le devoir doit exister dans l'école ; un teacher ne modifie que les SIENS.
    const existing = await prisma.homework.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) {
      return { success: false, error: true, message: "Devoir introuvable." };
    }
    if (session.role === "teacher" && existing.teacherId !== session.userId) {
      return { success: false, error: true, message: "Vous ne pouvez modifier que vos propres devoirs." };
    }

    const refusal = await checkTarget(session, classId, subjectId);
    if (refusal) return { success: false, error: true, message: refusal };

    await prisma.homework.update({
      where: { id },
      data: { title, content, dueDate, classId, subjectId, fileUrl: fileUrl || null },
    });

    // W10 — audit compact (champs modifiés uniquement)
    const diff = auditDiff(
      {
        title: existing.title,
        content: existing.content,
        dueDate: existing.dueDate,
        classId: existing.classId,
        subjectId: existing.subjectId,
        fileUrl: existing.fileUrl,
      },
      { title, content, dueDate, classId, subjectId, fileUrl: fileUrl || null }
    );
    if (diff.changed) {
      await auditWithSession(session, "homework.update", `Homework#${id}`, {
        before: diff.before,
        after: diff.after,
      });
    }

    revalidatePath("/list/homeworks");
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur updateHomework:", err);
    return { success: false, error: true, message: "Erreur lors de la modification du devoir." };
  }
};

export const deleteHomework = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = parseInt(data.get("id") as string);
  try {
    const session = await requireSchool(PUBLISHER_ROLES);

    const existing = await prisma.homework.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) {
      return { success: false, error: true, message: "Devoir introuvable." };
    }
    if (session.role === "teacher" && existing.teacherId !== session.userId) {
      return { success: false, error: true, message: "Vous ne pouvez supprimer que vos propres devoirs." };
    }

    await prisma.homework.delete({ where: { id } });

    await auditWithSession(session, "homework.delete", `Homework#${id}`, {
      before: {
        title: existing.title,
        classId: existing.classId,
        subjectId: existing.subjectId,
        dueDate: existing.dueDate.toISOString(),
      },
    });

    revalidatePath("/list/homeworks");
    return { success: true, error: false };
  } catch (err: any) {
    console.error("Erreur deleteHomework:", err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
