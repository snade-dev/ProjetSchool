"use server";

import { revalidatePath } from "next/cache";
import { FeeStructureSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
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
    const { schoolId } = await requireSchool(["admin"]); // V03
    const activeYear = await getActiveSchoolYear(schoolId);

    await prisma.feeStructure.create({
      data: {
        schoolId,
        label: data.label,
        amount: data.amount,
        period: data.period,
        classId: data.classId,
        schoolYearId: activeYear.id,
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
    await requireRole(["admin"]);
    const activeYear = await getActiveSchoolYear();

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
    await requireRole(["admin"]);

    await prisma.feeStructure.delete({
      where: { id: parseInt(id) },
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
    await requireRole(["admin"]);

    if (!fromClassId || !toClassId || fromClassId === toClassId) {
      return { success: false, error: true };
    }

    const activeYear = await getActiveSchoolYear();

    const sourceFees = await prisma.feeStructure.findMany({
      where: { classId: fromClassId, schoolYearId: activeYear.id },
    });

    if (sourceFees.length === 0) {
      return { success: false, error: true };
    }

    await prisma.feeStructure.createMany({
      data: sourceFees.map((fee) => ({
        label: fee.label,
        amount: fee.amount,
        period: fee.period,
        classId: toClassId,
        schoolYearId: activeYear.id,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/list/fees");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
