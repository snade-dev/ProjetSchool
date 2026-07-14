"use server";

import { justificationSchema, JustificationSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { auditWithSession } from "../audit";
import { notify } from "../notify";
import { revalidatePath } from "next/cache";

/**
 * W15 — Justifications d'absence (§2.3.6) :
 * - le PARENT dépose une justification (motif + document optionnel) sur une
 *   absence d'UN DE SES ENFANTS (lien StudentGuardian obligatoire) ;
 * - la direction (admin / director / supervisor) accepte ou refuse ;
 *   accepter pose Attendance.justified=true (« Absent (justifié) ») ;
 * - le parent est notifié du résultat (type ABSENCE — critique, doublé email).
 * Statuts (enum RequestStatus existante) : PENDING → COMPLETED / REJECTED.
 */

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const DECIDER_ROLES = ["admin", "director", "supervisor"];

export const createJustification = async (
  currentState: CurrentState,
  data: JustificationSchema
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(["parent"]);

    const parsed = justificationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }
    const { attendanceId, reason, fileUrl } = parsed.data;

    // L'absence doit exister dans l'école du parent, être une ABSENCE, et
    // concerner un de SES enfants (StudentGuardian) — défense en profondeur
    // contre les ids forgés.
    const attendance = await prisma.attendance.findFirst({
      where: { id: attendanceId, class: { schoolId: session.schoolId } },
      select: {
        id: true,
        present: true,
        date: true,
        studentId: true,
        justification: { select: { id: true } },
      },
    });
    if (!attendance) {
      return { success: false, error: true, message: "Pointage introuvable." };
    }
    if (attendance.present) {
      return {
        success: false,
        error: true,
        message: "Ce pointage n'est pas une absence.",
      };
    }
    const guardian = await prisma.studentGuardian.findUnique({
      where: {
        studentId_parentId: {
          studentId: attendance.studentId,
          parentId: session.userId,
        },
      },
      select: { id: true },
    });
    if (!guardian) {
      return {
        success: false,
        error: true,
        message: "Vous ne pouvez justifier que les absences de vos enfants.",
      };
    }
    if (attendance.justification) {
      return {
        success: false,
        error: true,
        message: "Une justification existe déjà pour cette absence.",
      };
    }

    const justification = await prisma.absenceJustification.create({
      data: {
        attendanceId,
        parentId: session.userId,
        reason,
        fileUrl: fileUrl || null,
        schoolId: session.schoolId,
      },
    });

    // W10 — journal d'audit
    await auditWithSession(
      session,
      "justification.create",
      `AbsenceJustification#${justification.id}`,
      {
        after: {
          attendanceId,
          studentId: attendance.studentId,
          date: attendance.date.toISOString(),
          hasFile: !!fileUrl,
        },
      }
    );

    revalidatePath("/list/attendances");
    revalidatePath("/list/justifications");
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur createJustification:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'envoi de la justification.",
    };
  }
};

export const decideJustification = async (
  currentState: CurrentState,
  data: { id: number; decision: "ACCEPT" | "REJECT"; note?: string }
): Promise<CurrentState> => {
  try {
    const session = await requireSchool(DECIDER_ROLES);

    const id = Number(data.id);
    const decision = data.decision === "ACCEPT" ? "ACCEPT" : "REJECT";
    const note = typeof data.note === "string" ? data.note.trim() : "";
    if (!Number.isInteger(id) || id < 1) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const existing = await prisma.absenceJustification.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        attendance: {
          select: {
            id: true,
            date: true,
            sessionDay: true,
            student: { select: { name: true, surname: true } },
          },
        },
      },
    });
    if (!existing) {
      return { success: false, error: true, message: "Justification introuvable." };
    }
    if (existing.status !== "PENDING") {
      return {
        success: false,
        error: true,
        message: "Cette justification a déjà été traitée.",
      };
    }

    const status = decision === "ACCEPT" ? "COMPLETED" : "REJECTED";

    // Décision + effet sur le pointage dans la MÊME transaction :
    // accepter → « Absent (justifié) » sur l'Attendance concernée.
    await prisma.$transaction([
      prisma.absenceJustification.update({
        where: { id },
        data: {
          status,
          decidedById: session.userId,
          decidedAt: new Date(),
          decisionNote: note || null,
        },
      }),
      prisma.attendance.update({
        where: { id: existing.attendanceId },
        data: { justified: decision === "ACCEPT" },
      }),
    ]);

    // W10 — journal d'audit (motif de refus dans reason)
    await auditWithSession(
      session,
      "justification.decide",
      `AbsenceJustification#${id}`,
      {
        before: { status: "PENDING" },
        after: { status, attendanceId: existing.attendanceId },
        reason: note || null,
      }
    );

    // W12 — notification du résultat au parent déposant (type ABSENCE :
    // critique, doublée par email si canal configuré).
    const dateFr = existing.attendance.date.toLocaleDateString("fr-FR");
    const child = `${existing.attendance.student.name} ${existing.attendance.student.surname}`;
    await notify([existing.parentId], {
      schoolId: session.schoolId,
      type: "ABSENCE",
      title:
        decision === "ACCEPT"
          ? "Justification d'absence acceptée"
          : "Justification d'absence refusée",
      body:
        decision === "ACCEPT"
          ? `L'absence de ${child} du ${dateFr} est désormais justifiée.`
          : `La justification de l'absence de ${child} du ${dateFr} a été refusée.${note ? ` Motif : ${note}` : ""}`,
      link: "/list/attendances",
    });

    revalidatePath("/list/justifications");
    revalidatePath("/list/attendances");
    return { success: true, error: false };
  } catch (err) {
    console.error("Erreur decideJustification:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors du traitement de la justification.",
    };
  }
};
