"use server";

// W02 — CRUD des niveaux scolaires (§2.1.4), scopé à l'école de la session.

import { LevelSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from "../actionErrors";

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

export const createLevel = async (
  currentState: CurrentState2,
  data: LevelSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);

    // Unicité (schoolId, name) — contrôle applicatif pour un message clair
    const existing = await prisma.level.findFirst({
      where: { name: data.name, schoolId },
    });
    if (existing) {
      return { success: false, error: true, message: "Ce niveau existe déjà" };
    }

    await prisma.level.create({
      data: {
        schoolId,
        name: data.name,
        order: data.order,
        cycle: data.cycle || null,
      },
    });

    revalidatePath("/list/levels");
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

export const updateLevel = async (
  currentState: CurrentState2,
  data: LevelSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
    // Cloisonnement : le niveau doit appartenir à l'école de la session
    const owned = await prisma.level.findFirst({
      where: { id: data.id, schoolId },
      select: { id: true },
    });
    if (!owned) {
      return {
        success: false,
        error: true,
        message: "Niveau introuvable dans votre établissement.",
      };
    }

    await prisma.level.update({
      where: { id: data.id },
      data: {
        name: data.name,
        order: data.order,
        cycle: data.cycle || null,
      },
    });

    revalidatePath("/list/levels");
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

export const deleteLevel = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
    // Cloisonnement
    const owned = await prisma.level.findFirst({
      where: { id: parseInt(id), schoolId },
      select: { id: true },
    });
    if (!owned) return { success: false, error: true };

    await prisma.level.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/list/levels");
    return { success: true, error: false };
  } catch (error: any) {
    console.log(error);
    return { success: false, error: true, message: deleteErrorMessage(error) };
  }
};
