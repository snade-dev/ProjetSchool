"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { guardianSchema, GuardianSchema } from "../formsValidationSchema";

/**
 * W05 — CRUD des tuteurs d'un élève (StudentGuardian, §2.2.3).
 * Toutes les actions sont scopées école (requireSchool) : le parent ET
 * l'élève doivent appartenir à l'école de la session.
 */

type ActionResult = { success: boolean; error: boolean; message: string };

/** Vérifie que l'élève et le parent appartiennent à l'école de la session. */
const checkOwnership = async (
  schoolId: number,
  studentId: string,
  parentId: string
): Promise<string | null> => {
  const [student, parent] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    }),
    prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      select: { id: true },
    }),
  ]);
  if (!student) return "Élève introuvable dans votre établissement.";
  if (!parent) return "Tuteur introuvable dans votre établissement.";
  return null;
};

/** Ajoute un tuteur existant à un élève (lien + relation + droits). */
export const addGuardian = async (
  currentState: ActionResult,
  data: GuardianSchema
): Promise<ActionResult> => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
    const parsed = guardianSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const ownershipError = await checkOwnership(
      schoolId,
      parsed.data.studentId,
      parsed.data.parentId
    );
    if (ownershipError) {
      return { success: false, error: true, message: ownershipError };
    }

    const existing = await prisma.studentGuardian.findUnique({
      where: {
        studentId_parentId: {
          studentId: parsed.data.studentId,
          parentId: parsed.data.parentId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return {
        success: false,
        error: true,
        message: "Ce parent est déjà tuteur de cet élève.",
      };
    }

    await prisma.studentGuardian.create({
      data: {
        studentId: parsed.data.studentId,
        parentId: parsed.data.parentId,
        relationship: parsed.data.relationship,
        isLegal: parsed.data.isLegal,
        canPay: parsed.data.canPay,
        canViewGrades: parsed.data.canViewGrades,
        canPickup: parsed.data.canPickup,
      },
    });

    revalidatePath(`/list/students/${parsed.data.studentId}`);
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

/** Met à jour la relation et les droits d'un lien tuteur existant. */
export const updateGuardian = async (
  currentState: ActionResult,
  data: GuardianSchema
): Promise<ActionResult> => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
    const parsed = guardianSchema.safeParse(data);
    if (!parsed.success || !parsed.data.id) {
      return { success: false, error: true, message: "Données invalides." };
    }

    // Le lien doit exister ET pointer vers un élève de l'école de la session
    const guardian = await prisma.studentGuardian.findFirst({
      where: { id: parsed.data.id, student: { schoolId } },
      select: { id: true, studentId: true },
    });
    if (!guardian) {
      return {
        success: false,
        error: true,
        message: "Tuteur introuvable dans votre établissement.",
      };
    }

    await prisma.studentGuardian.update({
      where: { id: guardian.id },
      data: {
        relationship: parsed.data.relationship,
        isLegal: parsed.data.isLegal,
        canPay: parsed.data.canPay,
        canViewGrades: parsed.data.canViewGrades,
        canPickup: parsed.data.canPickup,
      },
    });

    revalidatePath(`/list/students/${guardian.studentId}`);
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

/** Retire un tuteur d'un élève (le Parent lui-même n'est pas supprimé). */
export const removeGuardian = async (
  currentState: ActionResult,
  data: FormData
): Promise<ActionResult> => {
  const id = parseInt(data.get("id") as string);
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
    if (Number.isNaN(id)) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const guardian = await prisma.studentGuardian.findFirst({
      where: { id, student: { schoolId } },
      select: { id: true, studentId: true },
    });
    if (!guardian) {
      return {
        success: false,
        error: true,
        message: "Tuteur introuvable dans votre établissement.",
      };
    }

    // Garde-fou : ne pas laisser un élève sans aucun tuteur
    const remaining = await prisma.studentGuardian.count({
      where: { studentId: guardian.studentId },
    });
    if (remaining <= 1) {
      return {
        success: false,
        error: true,
        message:
          "Impossible : un élève doit conserver au moins un tuteur. Ajoutez-en un autre avant de retirer celui-ci.",
      };
    }

    await prisma.studentGuardian.delete({ where: { id: guardian.id } });

    revalidatePath(`/list/students/${guardian.studentId}`);
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};
