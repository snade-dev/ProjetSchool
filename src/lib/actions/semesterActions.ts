"use server";

import { SemesterSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { getActiveSchoolYear } from "../schoolYear";
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
    const { schoolId } = await requireSchool(["admin", "director"]); // V03

    // W02 — une période appartient à UNE année scolaire : création sur l'année ACTIVE
    const activeYear = await getActiveSchoolYear(schoolId);

    // W04 — le contrôle de doublon est scopé à l'école ET à l'année
    // (unicité schoolId + schoolYearId + name : « Trimestre 1 » peut exister
    // sur chaque année grâce au passage d'année).
    const existingSemester = await prisma.semester.findFirst({
      where: { name: data.name, schoolId, schoolYearId: activeYear.id },
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
        schoolYearId: activeYear.id, // W02
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
    const { schoolId } = await requireSchool(["admin", "director"]);
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

// V01/W09 — calendrier scolaire de référence du générateur de périodes.
// (constantes de module NON exportées : un fichier "use server" ne peut
// exporter que des fonctions async.)
const TRIMESTERS = [
  { order: 1, name: "Trimestre 1", label: "1er trimestre" },
  { order: 2, name: "Trimestre 2", label: "2e trimestre" },
  { order: 3, name: "Trimestre 3", label: "3e trimestre" },
];
const EVAL_MONTH_NAMES = [
  "octobre", "novembre", "décembre", "janvier",
  "février", "mars", "avril", "mai", "juin",
];
const MONTHS = EVAL_MONTH_NAMES.map((m, i) => ({
  order: i + 1,
  name: `Composition ${m}`,
  label: `Composition de ${m}`,
}));

/**
 * V01 — Génère les périodes manquantes d'un régime : 3 trimestres, ou les
 * compositions mensuelles d'octobre à juin. Une période est « manquante » si
 * aucune n'existe déjà avec le même couple (régime, ordre) ; les matières
 * existantes sont toutes rattachées (ajustable ensuite dans le formulaire).
 */
export const generatePeriods = async (system: "TRIMESTER" | "MONTHLY") => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]); // V03
    // W02 — la génération cible l'année scolaire ACTIVE de l'école
    const activeYear = await getActiveSchoolYear(schoolId);
    const wanted = system === "TRIMESTER" ? TRIMESTERS : MONTHS;

    const [existing, subjects] = await Promise.all([
      prisma.semester.findMany({
        // W02 — une période « manquante » s'apprécie sur l'année active
        where: { system, schoolId, schoolYearId: activeYear.id },
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
          schoolYearId: activeYear.id, // W02
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

/**
 * W09 — Génère le calendrier COMBINÉ d'une année (§2.3.1 système 3) :
 * N trimestres + compositions mensuelles pour les mois choisis. Règle du
 * cahier des charges : « pendant le mois du trimestre, il n'y a pas de
 * composition mensuelle » — le user déclare les mois de trimestre (un par
 * trimestre) et l'action REFUSE tout mois de composition qui chevauche un
 * mois de trimestre. Idempotent comme generatePeriods : une période existe
 * déjà (même régime, même ordre, année active) → elle n'est pas recréée.
 */
export const generateCombinedPeriods = async (input: {
  /** Nombre de trimestres (2 ou 3, §2.3.1 : « généralement 3, parfois 2 »). */
  trimesterCount: number;
  /** Mois de trimestre (composition trimestrielle) — un par trimestre. */
  trimesterMonths: string[];
  /** Mois de composition mensuelle cochés. */
  compositionMonths: string[];
}) => {
  try {
    const { schoolId } = await requireSchool(["admin", "director"]); // V03
    const activeYear = await getActiveSchoolYear(schoolId); // W02

    // ---- Validation du calendrier
    const { trimesterCount, trimesterMonths, compositionMonths } = input;
    if (!Number.isInteger(trimesterCount) || trimesterCount < 2 || trimesterCount > 3) {
      return { success: false, error: true, message: "Le nombre de trimestres doit être 2 ou 3." };
    }
    const known = new Set(EVAL_MONTH_NAMES);
    const unknown = [...trimesterMonths, ...compositionMonths].filter((m) => !known.has(m));
    if (unknown.length > 0) {
      return { success: false, error: true, message: `Mois inconnu(s) : ${unknown.join(", ")}.` };
    }
    if (new Set(trimesterMonths).size !== trimesterCount) {
      return {
        success: false,
        error: true,
        message: `Choisissez exactement ${trimesterCount} mois de trimestre (un par trimestre).`,
      };
    }
    // Règle §2.3.1 : pas de composition le mois d'un trimestre.
    const overlap = compositionMonths.filter((m) => trimesterMonths.includes(m));
    if (overlap.length > 0) {
      return {
        success: false,
        error: true,
        message: `Pas de composition mensuelle un mois de trimestre (§2.3.1) : décochez ${overlap.join(", ")}.`,
      };
    }
    if (compositionMonths.length === 0) {
      return {
        success: false,
        error: true,
        message: "Choisissez au moins un mois de composition (sinon générez simplement les trimestres).",
      };
    }

    // ---- Périodes voulues : N trimestres + une composition par mois coché
    const wantedTrimesters = TRIMESTERS.slice(0, trimesterCount);
    const wantedCompositions = MONTHS.filter((m) =>
      compositionMonths.includes(EVAL_MONTH_NAMES[m.order - 1])
    );

    const [existing, subjects] = await Promise.all([
      prisma.semester.findMany({
        where: { schoolId, schoolYearId: activeYear.id },
        select: { system: true, order: true },
      }),
      prisma.subject.findMany({ where: { schoolId }, select: { id: true } }),
    ]);
    const taken = new Set(existing.map((s) => `${s.system}:${s.order}`));
    const toCreate = [
      ...wantedTrimesters
        .filter((w) => !taken.has(`TRIMESTER:${w.order}`))
        .map((w) => ({ ...w, system: "TRIMESTER" as const })),
      ...wantedCompositions
        .filter((w) => !taken.has(`MONTHLY:${w.order}`))
        .map((w) => ({ ...w, system: "MONTHLY" as const })),
    ];

    for (const w of toCreate) {
      await prisma.semester.create({
        data: {
          schoolId,
          schoolYearId: activeYear.id, // W02
          name: w.name,
          system: w.system,
          order: w.order,
          label: w.label,
          subjects: { connect: subjects.map((s) => ({ id: s.id })) },
        },
      });
    }

    revalidatePath("/list/semester");
    const createdT = toCreate.filter((w) => w.system === "TRIMESTER").length;
    const createdM = toCreate.length - createdT;
    return {
      success: true,
      error: false,
      message:
        toCreate.length === 0
          ? "Toutes les périodes de ce calendrier combiné existent déjà."
          : `Calendrier combiné : ${createdT} trimestre(s) et ${createdM} composition(s) créé(s).`,
    };
  } catch (error) {
    console.error("generateCombinedPeriods:", error);
    return { success: false, error: true, message: "Génération impossible." };
  }
};

export const deleteSemester = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { schoolId } = await requireSchool(["admin", "director"]);
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
