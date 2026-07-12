"use server";

import { revalidatePath } from "next/cache";
import {
  SchoolSettingsSchema,
  SchoolYearSchema,
} from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { deleteErrorMessage } from '../actionErrors';

type CurrentState = {
  success: boolean;
  error: boolean;
};

// ---- SchoolSettings (singleton id = 1) ----
export const upsertSchoolSettings = async (
  currentState: CurrentState,
  data: SchoolSettingsSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin"]); // V03 — l'école de la session
    await prisma.school.upsert({
      where: { id: schoolId },
      update: {
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        logo: data.logo || null,
        currency: data.currency || "FCFA",
        legalFooter: data.legalFooter || null,
        themePrimary: data.themePrimary || null,
        themeSecondary: data.themeSecondary || null,
        themeAccent: data.themeAccent || null,
      },
      create: {
        id: schoolId,
        name: data.name,
        // V02 — slug SaaS requis à la création (cas base neuve uniquement)
        slug: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${schoolId}`,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        logo: data.logo || null,
        currency: data.currency || "FCFA",
        legalFooter: data.legalFooter || null,
        themePrimary: data.themePrimary || null,
        themeSecondary: data.themeSecondary || null,
        themeAccent: data.themeAccent || null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout"); // le thème (ThemeStyle) est injecté par le layout racine
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// ---- SchoolYear ----
export const createSchoolYear = async (
  currentState: CurrentState,
  data: SchoolYearSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin"]); // V03
    await prisma.schoolYear.create({
      data: {
        schoolId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? false,
      },
    });

    revalidatePath("/settings");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSchoolYear = async (
  currentState: CurrentState,
  data: SchoolYearSchema
) => {
  try {
    await requireRole(["admin"]);
    const { schoolId: sidU } = await requireSchool(["admin"]);
    const ownedU = await prisma.schoolYear.findFirst({
      where: { id: data.id, schoolId: sidU }, select: { id: true },
    });
    if (!ownedU) return { success: false, error: true };
    await prisma.schoolYear.update({
      where: { id: data.id },
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });

    revalidatePath("/settings");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSchoolYear = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole(["admin"]);
    const { schoolId: sidD } = await requireSchool(["admin"]);
    const ownedD = await prisma.schoolYear.findFirst({
      where: { id: parseInt(id), schoolId: sidD }, select: { id: true },
    });
    if (!ownedD) return { success: false, error: true };
    await prisma.schoolYear.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/settings");
    return { success: true, error: false };
  } catch (err: any) {
    // Violation de contrainte FK (année liée à des données) → échec propre
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// ---- Activation : une seule année active (invariant) ----
export const activateSchoolYear = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { schoolId: sidA } = await requireSchool(["admin"]); // V03
    const ownedA = await prisma.schoolYear.findFirst({
      where: { id: parseInt(id), schoolId: sidA }, select: { id: true },
    });
    if (!ownedA) return { success: false, error: true };
    await requireRole(["admin"]);
    await prisma.$transaction([
      // V03 — une seule année active PAR ÉCOLE
      prisma.schoolYear.updateMany({
        where: { schoolId: sidA },
        data: { isActive: false },
      }),
      prisma.schoolYear.update({
        where: { id: parseInt(id) },
        data: { isActive: true },
      }),
    ]);

    revalidatePath("/settings");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
