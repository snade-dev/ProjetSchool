"use server";

import { revalidatePath } from "next/cache";
import {
  SchoolSettingsSchema,
  SchoolYearSchema,
} from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";

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
    await requireRole(["admin"]);
    await prisma.schoolSettings.upsert({
      where: { id: 1 },
      update: {
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        logo: data.logo || null,
        currency: data.currency || "FCFA",
        legalFooter: data.legalFooter || null,
      },
      create: {
        id: 1,
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        logo: data.logo || null,
        currency: data.currency || "FCFA",
        legalFooter: data.legalFooter || null,
      },
    });

    revalidatePath("/settings");
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
    await requireRole(["admin"]);
    await prisma.schoolYear.create({
      data: {
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
    await prisma.schoolYear.delete({
      where: { id: parseInt(id) },
    });

    revalidatePath("/settings");
    return { success: true, error: false };
  } catch (err) {
    // Violation de contrainte FK (année liée à des données) → échec propre
    console.log(err);
    return { success: false, error: true };
  }
};

// ---- Activation : une seule année active (invariant) ----
export const activateSchoolYear = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole(["admin"]);
    await prisma.$transaction([
      prisma.schoolYear.updateMany({ data: { isActive: false } }),
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
