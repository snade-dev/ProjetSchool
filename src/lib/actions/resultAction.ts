"use server";

import { ResultFormSchema, ResultMSchema, ResultSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { auditWithSession } from "../audit";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from '../actionErrors';
import { createNotifications, guardianUserIds, notify } from "../notify";

/**
 * W12 — notification de notes : l'élève + ses tuteurs `canViewGrades`
 * reçoivent UNE notification par élève (jamais une par note). Résolution en
 * try/catch : un échec de notification ne casse jamais la saisie.
 */
const notifyGradesForStudent = async (
  studentId: string,
  schoolId: number,
  body: string
) => {
  try {
    const guardians = await guardianUserIds([studentId], "canViewGrades");
    await notify([studentId, ...guardians], {
      schoolId,
      type: "GRADE",
      title: "Notes",
      body,
      link: "/list/exams?tab=results",
    });
  } catch (err) {
    console.error("[notify] note non notifiée:", err);
  }
};

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

interface ActionResult {
  success: boolean;
  error: boolean;
  message: string;
}

export const createResult = async (
  currentState: ActionResult,
  data: ResultSchema
): Promise<ActionResult> => {
  try {
    const session = await requireRole(["admin", "director", "teacher"]);
    const { userId, role } = session;

    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername },
    });

    console.log("Etudiant trouvé:", student);


    if (!student) {
      return {
        success: false,
        error: true,
        message: "L'étudiant n'existe pas",
      };
    }

    // W03 — classe de l'élève = son inscription sur l'année de la période notée
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        schoolYear: { semesters: { some: { id: data.semesterId } } },
      },
      select: { classId: true },
    });
    if (!enrollment) {
      return {
        success: false,
        error: true,
        message: "L'élève n'est pas inscrit sur l'année de cette période",
      };
    }

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          subjectId: data.subjectId,
          classId: enrollment.classId,
        },
      });
      if (!teacherLesson) {
        return {
          success: false,
          error: true,
          message: "Vous ne pouvez noter que vos matières",
        };
      }
    }

    const result = await prisma.result.findUnique({
      where: {
        semesterId_studentId_subjectId: {
          studentId: student.id,
          semesterId: data.semesterId,      
          subjectId: data.subjectId,
        },
      },
    });

    console.log("Résultat trouvé:", result);
    

    if (result) {
      return {
        success: false,
        error: true,
        message: "Ce résultat existe déjà",
      };
    }

    const created = await prisma.result.create({
      data: {
        subjectId: data.subjectId,
        score: data.score,
        classScore: data.classScore,
        studentId: student.id,
        semesterId: data.semesterId,
      },
    });

    // W10 — journal d'audit : saisie d'une note (§2.11.2)
    await auditWithSession(session, "note.create", `Result#${created.id}`, {
      after: {
        student: student.username,
        subjectId: data.subjectId,
        semesterId: data.semesterId,
        score: data.score,
        classScore: data.classScore ?? null,
      },
      schoolId: student.schoolId,
    });

    // W12 — élève + tuteurs canViewGrades : notes de la matière publiées
    try {
      const [subject, semester] = await Promise.all([
        prisma.subject.findUnique({
          where: { id: data.subjectId },
          select: { name: true },
        }),
        prisma.semester.findUnique({
          where: { id: data.semesterId },
          select: { name: true, label: true },
        }),
      ]);
      await notifyGradesForStudent(
        student.id,
        student.schoolId,
        `Notes de ${subject?.name ?? "matière"} publiées (${
          semester?.label ?? semester?.name ?? "période"
        }).`
      );
    } catch (err) {
      console.error("[notify] note non notifiée:", err);
    }

    console.log("Note enregistrée avec succès");

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return {
      success: true,
      error: false,
      message: "Note enregistrée avec succès",
    };
  } catch (err) {
    console.error("Erreur détaillée:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la création de la note",
    };
  }
};



export async function updateResults(currentState: CurrentState2, resultsData: ResultFormSchema) {
  // Validation des données
  try {
    const session = await requireRole(["admin", "director", "teacher"]);

    // W10 — valeurs AVANT modification (pour le before/after du journal)
    const beforeRows = await prisma.result.findMany({
      where: { id: { in: resultsData.results.map((r) => r.id) } },
      select: {
        id: true,
        score: true,
        classScore: true,
        studentId: true, // W12 — regroupement des notifications par élève
        subject: { select: { name: true } }, // W12
        student: { select: { username: true, schoolId: true } },
      },
    });
    const beforeById = new Map(beforeRows.map((r) => [r.id, r]));

  // Mise à jour en transaction de tous les résultats
  await prisma.$transaction(
    resultsData.results.map(({ id, score, classscore }) =>
      prisma.result.update({
        where: { id },
        data: { score, classScore:classscore },
      })
    )
  );

    // W10 — journal d'audit : une entrée par note réellement modifiée (§2.11.2)
    // W12 — collecte des élèves réellement modifiés (matières concernées)
    const changedByStudent = new Map<
      string,
      { schoolId: number; subjects: Set<string> }
    >();
    for (const { id, score, classscore } of resultsData.results) {
      const prev = beforeById.get(id);
      if (!prev) continue;
      const newClassScore = classscore ?? null;
      if (prev.score === score && (prev.classScore ?? null) === newClassScore) continue;
      await auditWithSession(session, "note.update", `Result#${id}`, {
        before: { score: prev.score, classScore: prev.classScore ?? null },
        after: {
          score,
          classScore: newClassScore,
          student: prev.student.username,
        },
        schoolId: prev.student.schoolId,
      });
      const entry = changedByStudent.get(prev.studentId) ?? {
        schoolId: prev.student.schoolId,
        subjects: new Set<string>(),
      };
      entry.subjects.add(prev.subject.name);
      changedByStudent.set(prev.studentId, entry);
    }

    // W12 — UNE notification par élève modifié (élève + tuteurs canViewGrades)
    try {
      const studentIds = [...changedByStudent.keys()];
      if (studentIds.length > 0) {
        const guardians = await prisma.studentGuardian.findMany({
          where: { studentId: { in: studentIds }, canViewGrades: true },
          select: { studentId: true, parentId: true },
        });
        await createNotifications(
          studentIds.flatMap((studentId) => {
            const { schoolId, subjects } = changedByStudent.get(studentId)!;
            const body = `Notes de ${[...subjects].join(", ")} mises à jour.`;
            const recipients = [
              studentId,
              ...guardians
                .filter((g) => g.studentId === studentId)
                .map((g) => g.parentId),
            ];
            return recipients.map((userId) => ({
              userId,
              schoolId,
              type: "GRADE" as const,
              title: "Notes",
              body,
              link: "/list/exams?tab=results",
            }));
          })
        );
      }
    } catch (err) {
      console.error("[notify] mise à jour de notes non notifiée:", err);
    }

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return { success: true, error: false, message: "Notes mises à jour avec succès" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "Erreur lors de la mise à jour des notes" };
  }
}


export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const session = await requireRole(["admin", "director"]);

    // W10 — valeurs avant suppression (le journal garde la trace de la note)
    const before = await prisma.result.findUnique({
      where: { id: parseInt(id) },
      select: {
        score: true,
        classScore: true,
        subjectId: true,
        semesterId: true,
        student: { select: { username: true, schoolId: true } },
      },
    });

    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });

    // W10 — journal d'audit : suppression d'une note (§2.11.2)
    await auditWithSession(session, "note.delete", `Result#${id}`, {
      before: before
        ? {
            student: before.student.username,
            subjectId: before.subjectId,
            semesterId: before.semesterId,
            score: before.score,
            classScore: before.classScore ?? null,
          }
        : undefined,
      schoolId: before?.student.schoolId,
    });

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
