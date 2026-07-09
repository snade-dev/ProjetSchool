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
