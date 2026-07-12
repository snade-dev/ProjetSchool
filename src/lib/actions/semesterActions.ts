"use server";

import { SemesterSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from '../actionErrors';

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

// SEMESTER
export const createSemester = async (
  currentState: CurrentState,
  data: SemesterSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin"]); // V03

    const existingSemester = await prisma.semester.findFirst({
      where: { name: data.name },
    });

    if (existingSemester) {
      console.log("🔴 Semestre déjà existant :", existingSemester);
      return {
        success: false,
        error: true,
        message: "Le semestre existe déjà",
      };
    }

    await prisma.semester.create({
      data: {
        schoolId,
        name: data.name,
        system: data.system,
        order: data.order,
        label: data.label || null,
        subjects: {
          connect: data.subjects.map((id) => ({ id: Number(id) })), // Vérifier le type ici
        },
      },
    });

    console.log("✅ Semestre créé avec succès !");
    revalidatePath("/list/semester");
    return {
      success: true,
      error: false,
      message: "Semestre créé avec succès",
    };
  } catch (error) {
    console.error("❌ Erreur Prisma :", error);
    return { success: false, error: true, message: `Erreur serveur: ${error}` };
  }
};


export const updateSemester = async (
  currentState: CurrentState2,
  data: SemesterSchema
) => {
  try {
    const { schoolId } = await requireSchool(["admin"]);
    // V03 — la période doit appartenir à l'école de la session
    const owned = await prisma.semester.findFirst({
      where: { id: data.id, schoolId }, select: { id: true },
    });
    if (!owned) return { success: false, error: true, message: "Période introuvable dans votre établissement." };
    await prisma.semester.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        system: data.system,
        order: data.order,
        label: data.label || null,
        subjects: {
          set: data.subjects.map((id) => ({ id })), // Remplace les matières
        },
      },
    });

    revalidatePath("/list/semester");
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

/**
 * V01 — Génère les périodes manquantes d'un régime : 3 trimestres, ou les
 * compositions mensuelles d'octobre à juin. Une période est « manquante » si
 * aucune n'existe déjà avec le même couple (régime, ordre) ; les matières
 * existantes sont toutes rattachées (ajustable ensuite dans le formulaire).
 */
export const generatePeriods = async (system: "TRIMESTER" | "MONTHLY") => {
  const TRIMESTERS = [
    { order: 1, name: "Trimestre 1", label: "1er trimestre" },
    { order: 2, name: "Trimestre 2", label: "2e trimestre" },
    { order: 3, name: "Trimestre 3", label: "3e trimestre" },
  ];
  const MONTHS = [
    "octobre", "novembre", "décembre", "janvier",
    "février", "mars", "avril", "mai", "juin",
  ].map((m, i) => ({
    order: i + 1,
    name: `Composition ${m}`,
    label: `Composition de ${m}`,
  }));

  try {
    const { schoolId } = await requireSchool(["admin"]); // V03
    const wanted = system === "TRIMESTER" ? TRIMESTERS : MONTHS;

    const [existing, subjects] = await Promise.all([
      prisma.semester.findMany({
        where: { system, schoolId },
        select: { order: true },
      }),
      prisma.subject.findMany({ where: { schoolId }, select: { id: true } }),
    ]);
    const taken = new Set(existing.map((s) => s.order));
    const toCreate = wanted.filter((w) => !taken.has(w.order));

    for (const w of toCreate) {
      await prisma.semester.create({
        data: {
          schoolId,
          name: w.name,
          system,
          order: w.order,
          label: w.label,
          subjects: { connect: subjects.map((s) => ({ id: s.id })) },
        },
      });
    }

    revalidatePath("/list/semester");
    return {
      success: true,
      error: false,
      message:
        toCreate.length === 0
          ? "Toutes les périodes de ce régime existent déjà."
          : `${toCreate.length} période(s) créée(s).`,
    };
  } catch (error) {
    console.error("generatePeriods:", error);
    return { success: false, error: true, message: "Génération impossible." };
  }
};

export const deleteSemester = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { schoolId } = await requireSchool(["admin"]);
    // V03 — cloisonnement
    const ownedD = await prisma.semester.findFirst({
      where: { id: parseInt(id), schoolId }, select: { id: true },
    });
    if (!ownedD) return { success: false, error: true };
    await prisma.semester.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/semester");
    return { success: true, error: false };
  } catch (error: any) {
    console.log(error);
    return { success: false, error: true, message: deleteErrorMessage(error) };
  }
};
