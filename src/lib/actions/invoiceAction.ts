"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { getActiveSchoolYear } from "../schoolYear";
import { nextInvoiceReference } from "../invoiceRef";
import {
  InvoiceSchema,
  InvoiceLineSchema,
} from "../formsValidationSchema";

type CurrentState = {
  success: boolean;
  error: boolean;
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
    const { userId } = await requireRole(["admin"]);
    const activeYear = await getActiveSchoolYear();

    const total = linesTotal(data.lines);

    const run = () =>
      prisma.$transaction(async (tx) => {
        const reference = await nextInvoiceReference(tx);
        await tx.invoice.create({
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

    try {
      await run();
    } catch (err) {
      // Collision de référence (P2002) → une seule re-tentative suffit en mono-école.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        await run();
      } else {
        throw err;
      }
    }

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
    await requireRole(["admin"]);

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
    await requireRole(["admin"]);

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
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
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
    await requireRole(["admin"]);

    const paymentCount = await prisma.payment.count({
      where: { invoiceId: id },
    });
    if (paymentCount > 0) {
      return { success: false, error: true };
    }

    await prisma.invoice.delete({ where: { id } });

    revalidatePath("/list/invoices");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/**
 * Annulation d'une facture → statut CANCELLED. Refusée si un paiement existe.
 */
export const cancelInvoice = async (
  id: string
): Promise<CurrentState> => {
  try {
    await requireRole(["admin"]);

    const paymentCount = await prisma.payment.count({
      where: { invoiceId: id },
    });
    if (paymentCount > 0) {
      return { success: false, error: true };
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
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
// ---------------------------------------------------------------------------

// Clé d'idempotence d'une facture auto : re-lancer la génération ne duplique rien.
const genKey = (studentId: string, schoolYearId: number, month: number) =>
  `auto-${studentId}-${schoolYearId}-${month}`;

// Taille des paquets d'écriture : les références séquentielles interdisent un
// createMany naïf, on écrit donc par lots dans un $transaction avec timeout élargi.
const GEN_CHUNK = 25;

/**
 * Aperçu (indicatif) de la génération d'un mois donné, appelé par la PAGE quand
 * `?generate=1`. Refait ses requêtes à l'exécution : l'aperçu peut différer si
 * la grille des frais change entre-temps.
 */
export async function getGenerationPreview(
  month: number,
  year: number
): Promise<{ facturables: number; dejaGeneres: number }> {
  await requireRole(["admin"]);
  const activeYear = await getActiveSchoolYear();

  const [facturables, dejaGeneres] = await Promise.all([
    prisma.student.count({
      where: {
        class: {
          feeStructures: {
            some: { period: "MONTHLY", schoolYearId: activeYear.id },
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
    const { userId } = await requireRole(["admin"]);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { success: false, error: true, message: "Mois invalide (1-12)." };
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { success: false, error: true, message: "Année invalide." };
    }

    const activeYear = await getActiveSchoolYear();

    // Une passe complète : lecture des facturables + des déjà-générés, réservation
    // du bloc de références, puis écriture par paquets. Rendue idempotente pour
    // pouvoir être relancée telle quelle après un P2002 (collision de référence).
    const runGeneration = async (): Promise<{
      created: number;
      ignored: number;
    }> => {
      // (1) Élèves facturables — UNE requête, frais MONTHLY inclus (pas de N+1).
      const students = await prisma.student.findMany({
        where: {
          class: {
            feeStructures: {
              some: { period: "MONTHLY", schoolYearId: activeYear.id },
            },
          },
        },
        include: {
          class: {
            include: {
              feeStructures: {
                where: { period: "MONTHLY", schoolYearId: activeYear.id },
              },
            },
          },
        },
      });

      if (students.length === 0) {
        return { created: 0, ignored: 0 };
      }

      // (2) generationKey déjà présents pour ce mois → set des élèves déjà facturés.
      const keys = students.map((s) => genKey(s.id, activeYear.id, month));
      const existing = await prisma.invoice.findMany({
        where: { generationKey: { in: keys } },
        select: { generationKey: true },
      });
      const already = new Set(existing.map((e) => e.generationKey));

      const toCreate = students.filter(
        (s) => !already.has(genKey(s.id, activeYear.id, month))
      );
      const ignored = students.length - toCreate.length;

      if (toCreate.length === 0) {
        return { created: 0, ignored };
      }

      // (3) Construction EN MÉMOIRE. Échéance = 5 du mois (attention 0-index JS).
      const dueDate = new Date(year, month - 1, 5);
      // Réservation du bloc de références d'un coup : un seul count initial + index.
      const prefix = `FAC-${new Date().getFullYear()}-`;
      const base = await prisma.invoice.count({
        where: { reference: { startsWith: prefix } },
      });

      const payloads = toCreate.map((s, i) => {
        const fees = s.class!.feeStructures;
        const lines = fees.map((f) => ({
          label: f.label,
          quantity: 1,
          unitAmount: f.amount,
          feeStructureId: f.id,
        }));
        const total = lines.reduce(
          (sum, l) => sum + l.quantity * l.unitAmount,
          0
        );
        return {
          reference: `${prefix}${String(base + i + 1).padStart(5, "0")}`,
          status: "ISSUED" as const,
          dueDate,
          month,
          generationKey: genKey(s.id, activeYear.id, month),
          total,
          studentId: s.id,
          schoolYearId: activeYear.id,
          createdById: userId,
          lines: { create: lines },
        };
      });

      // (4) Écriture par paquets de ~25 dans un $transaction (timeout 30 s).
      //     Forme interactive (callback) : seule à accepter l'option `timeout`
      //     avec l'extension Accelerate.
      for (let i = 0; i < payloads.length; i += GEN_CHUNK) {
        const chunk = payloads.slice(i, i + GEN_CHUNK);
        await prisma.$transaction(
          async (tx) => {
            for (const data of chunk) {
              await tx.invoice.create({ data });
            }
          },
          { timeout: 30000 }
        );
      }

      return { created: toCreate.length, ignored };
    };

    let result: { created: number; ignored: number };
    try {
      result = await runGeneration();
    } catch (err) {
      // Collision de référence pendant le batch → relance simple : l'idempotence
      // par generationKey saute les factures déjà écrites et le count de base
      // reflète les références consommées entre-temps.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        result = await runGeneration();
      } else {
        throw err;
      }
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
