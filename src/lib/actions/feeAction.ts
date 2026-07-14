"use server";

import { revalidatePath } from "next/cache";
import { FeeStructureSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession, auditDiff } from "../audit";
import { getActiveSchoolYear } from "../schoolYear";
import { deleteErrorMessage } from '../actionErrors';

type CurrentState = {
  success: boolean;
  error: boolean;
};

export const createFee = async (
  currentState: CurrentState,
  data: FeeStructureSchema
) => {
  try {
    const session = await requireSchool(["admin", "accountant"]); // V03
    const { schoolId } = session;
    const activeYear = await getActiveSchoolYear(schoolId);

    const created = await prisma.feeStructure.create({
      data: {
        schoolId,
        label: data.label,
        amount: data.amount,
        period: data.period,
        classId: data.classId,
        schoolYearId: activeYear.id,
      },
    });

    // W10 — journal d'audit : création d'un frais (§2.11.2)
    await auditWithSession(session, "fee.create", `FeeStructure#${created.id}`, {
      after: {
        label: data.label,
        amount: data.amount,
        period: data.period,
        classId: data.classId,
      },
    });

    revalidatePath("/list/fees");
    return { success: true, error: false };
  } catch (err) {
    // P2002 (doublon classe+année+label) et toute autre erreur → toast d'erreur standard
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateFee = async (
  currentState: CurrentState,
  data: FeeStructureSchema
) => {
  try {
    const session = await requireRole(["admin", "accountant"]);
    const activeYear = await getActiveSchoolYear();

    // W10 — valeurs avant modification (§2.11.2 « modification des frais »)
    const before = await prisma.feeStructure.findUnique({
      where: { id: data.id },
      select: { label: true, amount: true, period: true, classId: true, schoolId: true },
    });

    await prisma.feeStructure.update({
      where: { id: data.id },
      data: {
        label: data.label,
        amount: data.amount,
        period: data.period,
        classId: data.classId,
        schoolYearId: activeYear.id,
      },
    });

    // W10 — journal d'audit : champs modifiés seulement
    if (before) {
      const diff = auditDiff(before as unknown as Record<string, unknown>, {
        label: data.label,
        amount: data.amount,
        period: data.period,
        classId: data.classId,
      });
      if (diff.changed) {
        await auditWithSession(session, "fee.update", `FeeStructure#${data.id}`, {
          before: diff.before,
          after: diff.after,
          schoolId: before.schoolId,
        });
      }
    }

    revalidatePath("/list/fees");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteFee = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const session = await requireRole(["admin", "accountant"]);

    // W10 — trace du frais supprimé
    const before = await prisma.feeStructure.findUnique({
      where: { id: parseInt(id) },
      select: { label: true, amount: true, period: true, classId: true, schoolId: true },
    });

    await prisma.feeStructure.delete({
      where: { id: parseInt(id) },
    });

    // W10 — journal d'audit : suppression d'un frais (§2.11.2)
    await auditWithSession(session, "fee.delete", `FeeStructure#${id}`, {
      before: before
        ? { label: before.label, amount: before.amount, period: before.period, classId: before.classId }
        : undefined,
      schoolId: before?.schoolId,
    });

    revalidatePath("/list/fees");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// Duplique tous les frais de l'année active d'une classe source vers une classe cible.
// La contrainte unique (classId, schoolYearId, label) + skipDuplicates ignorent les
// labels déjà présents sur la cible.
export const duplicateFees = async (
  fromClassId: number,
  toClassId: number
): Promise<CurrentState> => {
  try {
    // W01 — plus de @default(1) : schoolId explicite depuis la session,
    // et classes source/cible vérifiées dans l'école de la session.
    const session = await requireSchool(["admin", "accountant"]);
    const { schoolId } = session;

    if (!fromClassId || !toClassId || fromClassId === toClassId) {
      return { success: false, error: true };
    }

    const ownedClasses = await prisma.class.count({
      where: { id: { in: [fromClassId, toClassId] }, schoolId },
    });
    if (ownedClasses !== 2) {
      return { success: false, error: true };
    }

    const activeYear = await getActiveSchoolYear(schoolId);

    const sourceFees = await prisma.feeStructure.findMany({
      where: { classId: fromClassId, schoolYearId: activeYear.id, schoolId },
    });

    if (sourceFees.length === 0) {
      return { success: false, error: true };
    }

    const { count } = await prisma.feeStructure.createMany({
      data: sourceFees.map((fee) => ({
        label: fee.label,
        amount: fee.amount,
        period: fee.period,
        classId: toClassId,
        schoolYearId: activeYear.id,
        schoolId,
      })),
      skipDuplicates: true,
    });

    // W10 — journal d'audit : duplication de grille = UNE entrée résumé
    if (count > 0) {
      await auditWithSession(session, "fee.duplicate", `Class#${toClassId}`, {
        after: { fromClassId, toClassId, fraisCopies: count },
      });
    }

    revalidatePath("/list/fees");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
