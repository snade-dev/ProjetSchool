"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "../prisma";
import { requireSchool } from "../authGuard";
import { auditWithSession } from "../audit";
import { schoolYearSchema } from "../formsValidationSchema";
import {
  performRollover,
  type RolloverSummary,
} from "../rollover";

/**
 * W04 — Server actions de l'assistant de passage d'année (/settings/rollover).
 * Toutes scopées `requireSchool(["admin"])` ; le moteur (transactions,
 * idempotence, sémantique des statuts) vit dans src/lib/rollover.ts.
 */

type YearResult = {
  success: boolean;
  error: boolean;
  message?: string;
  yearId?: number;
};

/**
 * Étape 1 — Préparation : crée la nouvelle année scolaire en statut NON actif.
 * Idempotent-safe : si une année du même nom existe déjà (et n'est pas
 * l'année active), elle est réutilisée telle quelle.
 */
export const createRolloverYear = async (data: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<YearResult> => {
  try {
    const { schoolId } = await requireSchool(["admin"]);

    const parsed = schoolYearSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message:
          parsed.error.issues[0]?.message ?? "Données de l'année invalides.",
      };
    }

    const existing = await prisma.schoolYear.findUnique({
      where: { schoolId_name: { schoolId, name: parsed.data.name } },
    });
    if (existing) {
      if (existing.isActive) {
        return {
          success: false,
          error: true,
          message: `« ${existing.name} » est déjà l'année active — choisissez un autre nom.`,
        };
      }
      return { success: true, error: false, yearId: existing.id };
    }

    const created = await prisma.schoolYear.create({
      data: {
        schoolId,
        name: parsed.data.name,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        isActive: false, // la bascule est la DERNIÈRE étape de l'assistant
      },
    });

    revalidatePath("/settings");
    revalidatePath("/settings/rollover");
    return { success: true, error: false, yearId: created.id };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Erreur serveur." };
  }
};

const rolloverDecisionSchema = z.object({
  studentId: z.string().min(1),
  decision: z.enum(["PROMOTE", "REPEAT", "LEAVE", "GRADUATE"]),
  targetClassName: z.string().min(1).optional(),
});

const rolloverExecuteSchema = z.object({
  oldYearId: z.number().int().positive(),
  targetYearId: z.number().int().positive(),
  classIdsToCopy: z.array(z.number().int().positive()),
  decisions: z.array(rolloverDecisionSchema),
  carryArrears: z.boolean(),
  copyPeriods: z.boolean(),
  activate: z.boolean(),
});

export type RolloverExecuteInput = z.infer<typeof rolloverExecuteSchema>;

type ExecuteResult = {
  success: boolean;
  error: boolean;
  message: string;
  summary?: RolloverSummary;
};

/**
 * Étapes 2→5 — Validation de l'assistant : reconduction des classes (+ frais),
 * passage/redoublement/sortie/diplôme, report des impayés, reconduction des
 * périodes et bascule d'année. Idempotent : relancer ne duplique rien.
 */
export const executeRollover = async (
  payload: RolloverExecuteInput
): Promise<ExecuteResult> => {
  try {
    const session = await requireSchool(["admin"]);
    const { schoolId, userId } = session;

    const parsed = rolloverExecuteSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: true, message: "Données invalides." };
    }

    const summary = await performRollover(schoolId, userId, parsed.data);

    // W10 — journal d'audit : passage d'année = UNE entrée résumé avec les
    // comptes (inscriptions/réinscriptions couvertes ici, §2.11.2)
    await auditWithSession(session, "rollover.execute", `SchoolYear#${parsed.data.targetYearId}`, {
      after: {
        oldYearId: parsed.data.oldYearId,
        targetYearId: parsed.data.targetYearId,
        classesCreees: summary.classesCreated,
        passages: summary.promoted,
        redoublements: summary.repeated,
        sorties: summary.left,
        diplomes: summary.graduated,
        facturesArrieres: summary.arrearsCreated,
        periodesReconduites: summary.periodsCreated,
        anneeActivee: summary.activated,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/settings/rollover");
    revalidatePath("/list/classes");
    revalidatePath("/list/fees");
    revalidatePath("/list/invoices");
    revalidatePath("/list/semester");
    revalidatePath("/list/students");

    const parts = [
      `${summary.classesCreated} classe(s) créée(s)` +
        (summary.classesExisting > 0
          ? ` (${summary.classesExisting} déjà présente(s))`
          : ""),
      `${summary.promoted} passage(s)`,
      `${summary.repeated} redoublement(s)`,
      `${summary.left} sortie(s)`,
      `${summary.graduated} diplômé(s)`,
      `${summary.arrearsCreated} facture(s) d'arriérés`,
      `${summary.periodsCreated} période(s) reconduite(s)`,
      summary.activated ? "nouvelle année ACTIVÉE" : "année NON basculée",
    ];

    return {
      success: true,
      error: false,
      message: parts.join(", ") + ".",
      summary,
    };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message:
        err instanceof Error && err.message
          ? err.message
          : "Erreur lors du passage d'année.",
    };
  }
};
