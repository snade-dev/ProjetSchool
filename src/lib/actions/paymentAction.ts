"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { auditWithSession } from "../audit";
import { notifyGuardians } from "../notify";
import { renderReceiptPdfBuffer } from "../pdfBuffers";
import { paymentMethodLabel } from "../finance";
import { PaymentSchema } from "../formsValidationSchema";
import { InvoiceStatus } from "@/app/generated/prisma";
import { deleteErrorMessage } from '../actionErrors';

/**
 * Statut dérivé d'une facture après (dé)paiement — jamais fourni par le client :
 *   Σ == total          → PAID
 *   sinon dueDate passée → OVERDUE
 *   sinon Σ > 0          → PARTIALLY_PAID
 *   sinon                → ISSUED
 * (story-08 : une OVERDUE réglée intégralement passe PAID ; partiellement, reste OVERDUE.)
 */
const deriveInvoiceStatus = (
  paidSum: number,
  total: number,
  dueDate: Date
): InvoiceStatus => {
  if (paidSum >= total) return "PAID";
  if (dueDate < new Date()) return "OVERDUE";
  if (paidSum > 0) return "PARTIALLY_PAID";
  return "ISSUED";
};

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
    const session = await requireRole(["admin", "accountant"]);
    const { userId } = session;

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          payments: true,
          // W12 — destinataires de la notification (tuteurs canPay de l'élève)
          // W13 — nom/prénom pour le reçu PDF joint à l'email
          student: {
            select: { id: true, schoolId: true, name: true, surname: true },
          },
        },
      });

      if (!invoice) throw new Error("__NOT_FOUND__");
      if (invoice.status === "CANCELLED") throw new Error("__CANCELLED__");

      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = invoice.total - paid;

      if (data.amount > balance) throw new Error("__OVER__");

      const payment = await tx.payment.create({
        data: {
          amount: data.amount,
          method: data.method,
          paidAt: data.paidAt,
          reference: data.reference ? data.reference : null,
          invoiceId: invoice.id,
          receivedById: userId,
        },
      });

      // Statut dérivé (jamais fourni par le client), OVERDUE si échéance dépassée.
      const newPaid = paid + data.amount;
      const status = deriveInvoiceStatus(
        newPaid,
        invoice.total,
        invoice.dueDate
      );

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });

      return {
        payment,
        invoiceReference: invoice.reference,
        newStatus: status,
        studentId: invoice.student.id,
        schoolId: invoice.student.schoolId,
        studentName: invoice.student.name,
        studentSurname: invoice.student.surname,
        schoolYearId: invoice.schoolYearId,
      };
    });

    // W10 — journal d'audit : encaissement d'un paiement (§2.11.2)
    await auditWithSession(session, "payment.create", `Payment#${created.payment.id}`, {
      after: {
        facture: created.invoiceReference,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        nouveauStatut: created.newStatus,
      },
    });

    // W13 — reçu PDF joint à l'email PAYMENT (réutilise PaymentReceiptPdf de
    // /list/invoices/[id] via renderToBuffer). Best-effort : un échec de rendu
    // n'empêche ni la notification in-app ni l'encaissement.
    let emailAttachments;
    try {
      const [school, enrollment, cashier] = await Promise.all([
        prisma.school.findUnique({
          where: { id: created.schoolId },
          select: {
            name: true,
            address: true,
            phone: true,
            email: true,
            legalFooter: true,
          },
        }),
        prisma.enrollment.findUnique({
          where: {
            studentId_schoolYearId: {
              studentId: created.studentId,
              schoolYearId: created.schoolYearId,
            },
          },
          select: { class: { select: { name: true } } },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        }),
      ]);
      const buffer = await renderReceiptPdfBuffer({
        receiptNo: created.payment.id.slice(0, 8).toUpperCase(),
        school: {
          name: school?.name ?? "Établissement",
          address: school?.address,
          phone: school?.phone,
          email: school?.email,
          legalFooter: school?.legalFooter,
        },
        student: {
          name: created.studentName,
          surname: created.studentSurname,
          className: enrollment?.class.name ?? null,
        },
        invoiceRef: created.invoiceReference,
        amount: data.amount,
        methodLabel: paymentMethodLabel(data.method),
        date: data.paidAt,
        cashier: cashier?.name ?? "Administration",
      });
      emailAttachments = [
        {
          filename: `recu_${created.invoiceReference}_${created.payment.id.slice(0, 8)}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ];
    } catch (err) {
      console.error("[email] rendu du reçu PDF impossible (email sans pièce jointe):", err);
      emailAttachments = undefined;
    }

    // W12 — reçu de paiement → tuteurs canPay de l'élève facturé (§2.6.1) ;
    // le helper ne fait jamais échouer l'encaissement. W13 : la notification
    // PAYMENT est doublée par email (avec le reçu PDF joint) via notify.ts.
    await notifyGuardians(
      [created.studentId],
      {
        schoolId: created.schoolId,
        type: "PAYMENT",
        title: "Paiement reçu",
        body: `Paiement de ${data.amount.toLocaleString("fr-FR")} FCFA reçu — facture ${created.invoiceReference}.`,
        link: `/list/invoices/${data.invoiceId}`,
        emailAttachments,
      },
      "canPay"
    );

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
    const session = await requireRole(["admin", "accountant"]);

    let invoiceId = "";

    const deleted = await prisma.$transaction(async (tx) => {
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
        status = deriveInvoiceStatus(
          remaining,
          invoice.total,
          invoice.dueDate
        );
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });

      return {
        amount: payment.amount,
        method: payment.method,
        invoiceReference: invoice.reference,
        newStatus: status,
      };
    });

    // W10 — journal d'audit : suppression d'un paiement (§2.11.2)
    await auditWithSession(session, "payment.delete", `Payment#${paymentId}`, {
      before: {
        facture: deleted.invoiceReference,
        amount: deleted.amount,
        method: deleted.method,
      },
      after: { nouveauStatut: deleted.newStatus },
    });

    revalidatePath("/list/invoices");
    revalidatePath(`/list/invoices/${invoiceId}`);
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
