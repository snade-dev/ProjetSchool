"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { PaymentSchema } from "../formsValidationSchema";

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

/**
 * Encaissement d'un paiement (admin caissier).
 *
 * Invariant §6.3 : Σ payments ≤ total, statut recalculé serveur.
 * Le solde est RELU DANS la transaction (forme interactive, cf. H30) pour éviter
 * une course entre deux encaissements ; le sur-paiement est refusé.
 */
export const createPayment = async (
  _currentState: CurrentStateMsg,
  data: PaymentSchema
): Promise<CurrentStateMsg> => {
  try {
    const { userId } = await requireRole(["admin"]);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error("__NOT_FOUND__");
      if (invoice.status === "CANCELLED") throw new Error("__CANCELLED__");

      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = invoice.total - paid;

      if (data.amount > balance) throw new Error("__OVER__");

      await tx.payment.create({
        data: {
          amount: data.amount,
          method: data.method,
          paidAt: data.paidAt,
          reference: data.reference ? data.reference : null,
          invoiceId: invoice.id,
          receivedById: userId,
        },
      });

      // Statut dérivé (jamais fourni par le client) : tout payé → PAID, sinon PARTIALLY_PAID.
      const newPaid = paid + data.amount;
      const status = newPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });
    });

    revalidatePath("/list/invoices");
    revalidatePath(`/list/invoices/${data.invoiceId}`);
    return { success: true, error: false, message: "Paiement enregistré." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "__OVER__") {
      return {
        success: false,
        error: true,
        message: "Montant supérieur au solde",
      };
    }
    if (msg === "__CANCELLED__") {
      return {
        success: false,
        error: true,
        message: "Facture annulée : encaissement impossible.",
      };
    }
    if (msg === "__NOT_FOUND__") {
      return { success: false, error: true, message: "Facture introuvable." };
    }
    console.log(err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de l'encaissement.",
    };
  }
};

/**
 * Suppression d'un paiement (admin) — corrige une erreur de saisie.
 * Le statut de la facture est recalculé dans la même transaction et peut
 * redescendre jusqu'à ISSUED (0 payé). Une facture CANCELLED reste CANCELLED.
 */
export const deletePayment = async (
  paymentId: string
): Promise<CurrentState> => {
  try {
    await requireRole(["admin"]);

    let invoiceId = "";

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: { payments: true } } },
      });

      if (!payment) throw new Error("Paiement introuvable");
      const invoice = payment.invoice;
      invoiceId = invoice.id;

      await tx.payment.delete({ where: { id: paymentId } });

      const remaining = invoice.payments
        .filter((p) => p.id !== paymentId)
        .reduce((sum, p) => sum + p.amount, 0);

      let status = invoice.status;
      if (invoice.status !== "CANCELLED") {
        status =
          remaining >= invoice.total
            ? "PAID"
            : remaining > 0
            ? "PARTIALLY_PAID"
            : "ISSUED";
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status },
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
