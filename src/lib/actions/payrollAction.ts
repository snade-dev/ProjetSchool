"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { getActiveSchoolYear } from "../schoolYear";
import {
  payrollGenerateSchema,
  salaryAdjustSchema,
  markPaidSchema,
  PayrollGenerateSchema,
  SalaryAdjustSchema,
  MarkPaidSchema,
} from "../formsValidationSchema";

// Pattern « CurrentState + message affichable » (identique aux actions finance).
type CurrentStateMsg = {
  success: boolean;
  error: boolean;
  message: string;
};

/**
 * Génère la paie du mois : un SalaryPayment PENDING par employé actif.
 * `baseAmount` copie le `baseSalary` du moment, `netAmount` = baseAmount
 * (primes/retenues à 0). Idempotent via `@@unique([employeeId, month, year])`
 * + `skipDuplicates` : relancer ne duplique rien.
 * Retour : « X générés, Y existants ».
 */
export const generatePayroll = async (
  _state: CurrentStateMsg,
  data: PayrollGenerateSchema
): Promise<CurrentStateMsg> => {
  try {
    await requireRole(["admin", "accountant"]);

    const parsed = payrollGenerateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Paramètres invalides.",
      };
    }
    const { month, year } = parsed.data;

    const activeYear = await getActiveSchoolYear();

    // Employés actifs uniquement : les désactivés sont exclus des générations
    // futures (leurs paies passées restent, cf. fiche).
    // V03 — cloisonnement : employés de l'école de la session uniquement
    const { schoolId: sidPay } = await requireSchool(["admin", "accountant"]);
    const employees = await prisma.employee.findMany({
      where: { active: true, schoolId: sidPay },
      select: { id: true, baseSalary: true },
    });

    if (employees.length === 0) {
      return {
        success: true,
        error: false,
        message: "0 générés, 0 existants",
      };
    }

    const result = await prisma.salaryPayment.createMany({
      data: employees.map((e) => ({
        month,
        year,
        baseAmount: e.baseSalary,
        bonuses: 0,
        deductions: 0,
        netAmount: e.baseSalary,
        status: "PENDING" as const,
        employeeId: e.id,
        schoolYearId: activeYear.id,
      })),
      skipDuplicates: true,
    });

    const generated = result.count;
    const existing = employees.length - generated;

    revalidatePath("/list/payroll");
    return {
      success: true,
      error: false,
      message: `${generated} générés, ${existing} existants`,
    };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la génération de la paie.",
    };
  }
};

/**
 * Ajuste primes/retenues d'un bulletin PENDING. Refusé si PAID.
 * `net = base + primes − retenues` recalculé SERVEUR (base = baseAmount stocké,
 * jamais une valeur venue du client). Net négatif → refusé.
 */
export const updateSalaryAdjustments = async (
  _state: CurrentStateMsg,
  data: SalaryAdjustSchema
): Promise<CurrentStateMsg> => {
  try {
    await requireRole(["admin", "accountant"]);

    const parsed = salaryAdjustSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Paramètres invalides.",
      };
    }
    const { id, bonuses, deductions } = parsed.data;

    const payment = await prisma.salaryPayment.findUnique({
      where: { id },
      select: { baseAmount: true, status: true },
    });

    if (!payment) {
      return { success: false, error: true, message: "Bulletin introuvable." };
    }
    if (payment.status === "PAID") {
      return {
        success: false,
        error: true,
        message: "Salaire déjà payé : ajustement impossible.",
      };
    }

    // Base = valeur serveur (baseAmount figé à la génération). Net recalculé ici.
    const net = payment.baseAmount + bonuses - deductions;
    if (net < 0) {
      return {
        success: false,
        error: true,
        message: "Net négatif impossible",
      };
    }

    await prisma.salaryPayment.update({
      where: { id },
      data: { bonuses, deductions, netAmount: net },
    });

    revalidatePath("/list/payroll");
    return { success: true, error: false, message: "Ajustements enregistrés." };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'ajustement.",
    };
  }
};

/**
 * Marque un bulletin PENDING comme PAID (méthode + date). No-op si déjà PAID.
 */
export const markSalaryPaid = async (
  _state: CurrentStateMsg,
  data: MarkPaidSchema
): Promise<CurrentStateMsg> => {
  try {
    await requireRole(["admin", "accountant"]);

    const parsed = markPaidSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Paramètres invalides.",
      };
    }
    const { id, method, paidAt } = parsed.data;

    const payment = await prisma.salaryPayment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!payment) {
      return { success: false, error: true, message: "Bulletin introuvable." };
    }
    if (payment.status === "PAID") {
      return {
        success: false,
        error: true,
        message: "Salaire déjà marqué payé.",
      };
    }

    await prisma.salaryPayment.update({
      where: { id },
      data: { status: "PAID", method, paidAt },
    });

    revalidatePath("/list/payroll");
    return { success: true, error: false, message: "Salaire marqué payé." };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors du marquage.",
    };
  }
};

/**
 * Correction d'erreur (admin) : repasse un bulletin PAID en PENDING, paidAt null.
 */
export const unmarkSalaryPaid = async (
  id: string
): Promise<CurrentStateMsg> => {
  try {
    await requireRole(["admin", "accountant"]);

    const payment = await prisma.salaryPayment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!payment) {
      return { success: false, error: true, message: "Bulletin introuvable." };
    }
    if (payment.status !== "PAID") {
      return {
        success: false,
        error: true,
        message: "Ce bulletin n'est pas marqué payé.",
      };
    }

    await prisma.salaryPayment.update({
      where: { id },
      data: { status: "PENDING", paidAt: null },
    });

    revalidatePath("/list/payroll");
    return {
      success: true,
      error: false,
      message: "Paiement annulé (repassé en attente).",
    };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'annulation.",
    };
  }
};
