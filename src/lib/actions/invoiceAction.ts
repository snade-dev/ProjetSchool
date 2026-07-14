"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession } from "../audit";
import { getActiveSchoolYear } from "../schoolYear";
import { nextInvoiceReference } from "../invoiceRef";
import { runMonthlyGeneration, monthlyFeeFilter } from "../invoiceGeneration";
import {
  InvoiceSchema,
  InvoiceLineSchema,
} from "../formsValidationSchema";
import { deleteErrorMessage } from "../actionErrors";

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

// Pattern CurrentState2 (déjà présent dans le repo) : action + message affichable.
type CurrentStateMsg = {
  success: boolean;
  error: boolean;
  message: string;
};

// Somme des lignes = Σ (quantité × prix unitaire). Recalculée serveur, jamais côté client.
const linesTotal = (lines: { quantity: number; unitAmount: number }[]) =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitAmount, 0);

/**
 * Création manuelle d'une facture (statut ISSUED, année scolaire active).
 * Référence unique générée dans la transaction ; re-tentative unique sur P2002
 * (collision de référence sous concurrence).
 */
export const createInvoice = async (
  currentState: CurrentState,
  data: InvoiceSchema
): Promise<CurrentState> => {
  try {
    const { userId } = await requireRole(["admin", "accountant"]);
    // V03 — l'élève facturé doit appartenir à l'école de la session
    const session = await requireSchool(["admin", "accountant"]);
    const { schoolId: sidI } = session;
    const studentInSchool = await prisma.student.findFirst({
      where: { id: data.studentId, schoolId: sidI }, select: { id: true },
    });
    if (!studentInSchool) return { success: false, error: true, message: "Élève introuvable dans votre établissement." };
    const activeYear = await getActiveSchoolYear(sidI);

    const total = linesTotal(data.lines);

    const run = () =>
      prisma.$transaction(async (tx) => {
        const reference = await nextInvoiceReference(tx);
        return tx.invoice.create({
          data: {
            reference,
            status: "ISSUED",
            dueDate: data.dueDate,
            total,
            studentId: data.studentId,
            schoolYearId: activeYear.id,
            createdById: userId,
            lines: {
              createMany: {
                data: data.lines.map((l) => ({
                  label: l.label,
                  quantity: l.quantity,
                  unitAmount: l.unitAmount,
                })),
              },
            },
          },
        });
      });

    let invoice;
    try {
      invoice = await run();
    } catch (err) {
      // Collision de référence (P2002) → une seule re-tentative suffit en mono-école.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        invoice = await run();
      } else {
        throw err;
      }
    }

    // W10 — journal d'audit : émission d'une facture (§2.11.2)
    await auditWithSession(session, "invoice.create", `Invoice#${invoice.reference}`, {
      after: {
        reference: invoice.reference,
        studentId: data.studentId,
        total,
        dueDate: data.dueDate,
        lignes: data.lines.length,
      },
    });

    revalidatePath("/list/invoices");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/**
 * Ajout d'une ligne à une facture existante. Refusé si des paiements existent
 * ou si la facture est PAID/CANCELLED. Le total est recalculé dans la même transaction.
 */
export const addInvoiceLine = async (
  invoiceId: string,
  data: InvoiceLineSchema
): Promise<CurrentState> => {
  try {
    await requireRole(["admin", "accountant"]);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { lines: true, payments: true },
      });

      if (!invoice) throw new Error("Facture introuvable");
      if (
        invoice.payments.length > 0 ||
        invoice.status === "PAID" ||
        invoice.status === "CANCELLED"
      ) {
        throw new Error("Facture non modifiable");
      }

      await tx.invoiceLine.create({
        data: {
          label: data.label,
          quantity: data.quantity,
          unitAmount: data.unitAmount,
          invoiceId,
        },
      });

      const total =
        invoice.total + data.quantity * data.unitAmount;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { total },
      });
    });

    revalidatePath("/list/invoices");
    revalidatePath(`/list/invoices/${invoiceId}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/**
 * Suppression d'une ligne. Refusé si des paiements existent, si la facture est
 * PAID/CANCELLED, ou si c'est la dernière ligne (une facture garde ≥ 1 ligne).
 * Le total est recalculé dans la même transaction.
 */
export const deleteInvoiceLine = async (
  lineId: number
): Promise<CurrentState> => {
  try {
    await requireRole(["admin", "accountant"]);

    await prisma.$transaction(async (tx) => {
      const line = await tx.invoiceLine.findUnique({
        where: { id: lineId },
        include: { invoice: { include: { lines: true, payments: true } } },
      });

      if (!line) throw new Error("Ligne introuvable");
      const invoice = line.invoice;

      if (
        invoice.payments.length > 0 ||
        invoice.status === "PAID" ||
        invoice.status === "CANCELLED"
      ) {
        throw new Error("Facture non modifiable");
      }
      if (invoice.lines.length <= 1) {
        throw new Error("Une facture doit garder au moins une ligne");
      }

      await tx.invoiceLine.delete({ where: { id: lineId } });

      const total = invoice.total - line.quantity * line.unitAmount;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { total },
      });
    });

    revalidatePath("/list/invoices");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

/**
 * Suppression définitive d'une facture (admin), refusée si un paiement existe.
 * Non exposée dans l'UI de S05 (on privilégie l'annulation) mais nécessaire pour
 * garder la carte des actions de FormModal cohérente.
 */
export const deleteInvoice = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  try {
    const session = await requireRole(["admin", "accountant"]);

    const paymentCount = await prisma.payment.count({
      where: { invoiceId: id },
    });
    if (paymentCount > 0) {
      return { success: false, error: true, message: "Impossible : des paiements sont rattachés à cette facture (annulez-la plutôt)." };
    }

    // W10 — trace de la facture supprimée pour le journal
    const before = await prisma.invoice.findUnique({
      where: { id },
      select: { reference: true, total: true, status: true, studentId: true },
    });

    await prisma.invoice.delete({ where: { id } });

    // W10 — journal d'audit : suppression définitive d'une facture (§2.11.2)
    await auditWithSession(session, "invoice.delete", `Invoice#${before?.reference ?? id}`, {
      before: before ?? undefined,
    });

    revalidatePath("/list/invoices");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

/**
 * Annulation d'une facture → statut CANCELLED. Refusée si un paiement existe.
 */
export const cancelInvoice = async (
  id: string
): Promise<CurrentState> => {
  try {
    const session = await requireRole(["admin", "accountant"]);

    const paymentCount = await prisma.payment.count({
      where: { invoiceId: id },
    });
    if (paymentCount > 0) {
      return { success: false, error: true };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: { reference: true, total: true, studentId: true },
    });

    // W10 — journal d'audit : annulation d'une facture (§2.11.2)
    await auditWithSession(session, "invoice.cancel", `Invoice#${updated.reference}`, {
      before: { status: "ISSUED" },
      after: { status: "CANCELLED", total: updated.total, studentId: updated.studentId },
    });

    revalidatePath("/list/invoices");
    revalidatePath(`/list/invoices/${id}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// ---------------------------------------------------------------------------
// Impayés & recouvrement (story-08)
// ---------------------------------------------------------------------------

/**
 * Bascule en OVERDUE toute facture encore ISSUED ou PARTIALLY_PAID dont
 * l'échéance est dépassée. Fonction serveur simple (PAS une form action) :
 * appelée en tête de `list/invoices/page.tsx` uniquement pour le rôle admin.
 * UPDATE ensembliste, idempotent (no-op la plupart du temps) — pas de cron.
 */
export async function syncOverdueInvoices(): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      status: { in: ["ISSUED", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}

/**
 * Note de relance (admin) : horodate la relance et enregistre une note libre.
 * Aucun envoi de SMS/e-mail (hors scope, cf. story-08 « Quand s'arrêter »).
 */
export const markReminded = async (
  id: string,
  note: string
): Promise<CurrentState> => {
  try {
    await requireRole(["admin", "accountant"]);

    await prisma.invoice.update({
      where: { id },
      data: {
        remindedAt: new Date(),
        reminderNote: note.trim() ? note.trim() : null,
      },
    });

    revalidatePath("/list/invoices");
    revalidatePath(`/list/invoices/${id}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// ---------------------------------------------------------------------------
// Génération automatique des factures mensuelles (story-06)
// W11 — cœur extrait dans lib/invoiceGeneration.ts (testable hors session) :
// l'action garde l'authentification, la validation, l'audit et le revalidate.
// ---------------------------------------------------------------------------

/**
 * Aperçu (indicatif) de la génération d'un mois donné, appelé par la PAGE quand
 * `?generate=1`. Refait ses requêtes à l'exécution : l'aperçu peut différer si
 * la grille des frais change entre-temps.
 */
export async function getGenerationPreview(
  month: number,
  year: number
): Promise<{ facturables: number; dejaGeneres: number }> {
  await requireRole(["admin", "accountant"]);
  const activeYear = await getActiveSchoolYear();

  const [facturables, dejaGeneres] = await Promise.all([
    // W03 — facturables = inscriptions de l'année active dont la classe a des
    // frais mensuels applicables AU MOIS DEMANDÉ (W11 : échéanciers respectés)
    prisma.enrollment.count({
      where: {
        schoolYearId: activeYear.id,
        class: {
          feeStructures: {
            some: monthlyFeeFilter(activeYear.id, month),
          },
        },
      },
    }),
    prisma.invoice.count({
      where: {
        schoolYearId: activeYear.id,
        month,
        generationKey: { not: null },
      },
    }),
  ]);

  return { facturables, dejaGeneres };
}

/**
 * Génère en un clic les factures mensuelles du mois demandé : une facture par
 * élève dont la classe a ≥ 1 FeeStructure MONTHLY de l'année active (une ligne
 * InvoiceLine par frais). Idempotent via `generationKey` unique : relancer ne
 * duplique rien et retourne « 0 créées, N ignorées ».
 */
export const generateMonthlyInvoices = async (
  _state: CurrentStateMsg,
  { month, year }: { month: number; year: number }
): Promise<CurrentStateMsg> => {
  try {
    const session = await requireRole(["admin", "accountant"]);
    const { userId } = session;

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { success: false, error: true, message: "Mois invalide (1-12)." };
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false, error: true, message: "Année invalide." };
    }

    const activeYear = await getActiveSchoolYear();

    // W11 — le cœur (facturables, idempotence, échéanciers, écriture par
    // paquets, retry P2002) vit dans lib/invoiceGeneration.ts.
    const result = await runMonthlyGeneration({
      schoolYearId: activeYear.id,
      month,
      year,
      createdById: userId,
    });

    // W10 — journal d'audit : génération mensuelle = UNE entrée résumé (§2.11.2)
    if (result.created > 0) {
      await auditWithSession(session, "invoice.generateMonthly", `SchoolYear#${activeYear.id}`, {
        after: {
          month,
          year,
          creees: result.created,
          ignorees: result.ignored,
        },
      });
    }

    revalidatePath("/list/invoices");
    return {
      success: true,
      error: false,
      message: `${result.created} créées, ${result.ignored} ignorées`,
    };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la génération des factures.",
    };
  }
};
