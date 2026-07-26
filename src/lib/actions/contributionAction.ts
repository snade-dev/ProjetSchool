"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession, auditDiff } from "../audit";
import { deleteErrorMessage } from "../actionErrors";
import { nextContributionReference } from "../contribution";
import { notifyGuardians } from "../notify";
import { Prisma } from "@/app/generated/prisma";
import {
  EventContributionSchema,
  ContributionPaymentSchema,
} from "../formsValidationSchema";

/**
 * X05 — Actions des cotisations d'événements (§2.4).
 * Le barème est posé par la direction ; les versements sont encaissés par la
 * direction ou le comptable. Toute écriture est auditée (W10) ; les tuteurs
 * sont notifiés à l'ouverture du registre et à chaque versement (W12, jamais
 * bloquant).
 */

type CurrentState = { success: boolean; error: boolean };
type DeleteState = { success: boolean; error: boolean; message?: string };

const CONTRIB_ADMIN = ["admin", "director"];
const CONTRIB_DESK = ["admin", "director", "accountant"];

// ---------------------------------------------------------------------------
// Barème (EventContribution)
// ---------------------------------------------------------------------------

/**
 * Crée OU met à jour le barème d'un événement (au plus un par événement :
 * l'unicité eventId rend l'upsert naturel côté métier).
 */
export const upsertEventContribution = async (
  currentState: CurrentState,
  data: EventContributionSchema
) => {
  try {
    const session = await requireSchool(CONTRIB_ADMIN);
    const { schoolId } = session;

    // Cloisonnement : l'événement doit appartenir à l'école de la session.
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, schoolId },
      select: { id: true, title: true, classId: true },
    });
    if (!event) return { success: false, error: true };

    const before = await prisma.eventContribution.findUnique({
      where: { eventId: data.eventId },
      select: { id: true, amount: true, dueDate: true, note: true },
    });

    const saved = await prisma.eventContribution.upsert({
      where: { eventId: data.eventId },
      create: {
        schoolId,
        eventId: data.eventId,
        amount: data.amount,
        dueDate: data.dueDate ?? null,
        note: data.note || null,
        createdById: session.userId,
      },
      update: {
        amount: data.amount,
        dueDate: data.dueDate ?? null,
        note: data.note || null,
      },
    });

    if (before) {
      const diff = auditDiff(before as unknown as Record<string, unknown>, {
        amount: data.amount,
        dueDate: data.dueDate ?? null,
        note: data.note || null,
      });
      if (diff.changed) {
        await auditWithSession(
          session,
          "contribution.update",
          `EventContribution#${saved.id}`,
          { before: diff.before, after: diff.after }
        );
      }
    } else {
      await auditWithSession(
        session,
        "contribution.create",
        `EventContribution#${saved.id}`,
        {
          after: {
            event: event.title,
            amount: data.amount,
            dueDate: data.dueDate ?? null,
          },
        }
      );

      // W12 — à l'OUVERTURE du registre seulement : les tuteurs des élèves
      // concernés sont prévenus du montant attendu. Jamais bloquant.
      try {
        const activeYear = await prisma.schoolYear.findFirst({
          where: { isActive: true, schoolId },
          select: { id: true },
        });
        if (activeYear) {
          const enrollments = await prisma.enrollment.findMany({
            where: {
              schoolYearId: activeYear.id,
              status: "ACTIVE",
              student: { schoolId },
              ...(event.classId ? { classId: event.classId } : {}),
            },
            select: { studentId: true },
          });
          await notifyGuardians(
            enrollments.map((e) => e.studentId),
            {
              schoolId,
              type: "PAYMENT",
              title: "Cotisation — " + event.title,
              body: `Une cotisation de ${data.amount.toLocaleString("fr-FR")} FCFA est attendue pour « ${event.title} ».`,
              link: `/list/events/${event.id}`,
            },
            // §2.2.3 — seuls les tuteurs qui peuvent payer sont sollicités
            "canPay"
          );
        }
      } catch (err) {
        console.error("[notify] ouverture de cotisation non notifiée:", err);
      }
    }

    revalidatePath("/list/events");
    revalidatePath(`/list/events/${data.eventId}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/** Clôture / réouverture du registre : plus aucun versement quand il est clos. */
export const toggleContributionClosed = async (
  currentState: CurrentState,
  data: { contributionId: number; close: boolean }
) => {
  try {
    const session = await requireRole(CONTRIB_ADMIN);

    const before = await prisma.eventContribution.findUnique({
      where: { id: data.contributionId },
      select: { closedAt: true, eventId: true, schoolId: true },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true };
    }

    await prisma.eventContribution.update({
      where: { id: data.contributionId },
      data: { closedAt: data.close ? new Date() : null },
    });

    await auditWithSession(
      session,
      data.close ? "contribution.close" : "contribution.reopen",
      `EventContribution#${data.contributionId}`,
      { before: { closedAt: before.closedAt }, after: { closed: data.close } }
    );

    revalidatePath(`/list/events/${before.eventId}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEventContribution = async (
  currentState: DeleteState,
  data: FormData
): Promise<DeleteState> => {
  const id = parseInt(data.get("id") as string);
  try {
    const session = await requireRole(CONTRIB_ADMIN);

    const before = await prisma.eventContribution.findUnique({
      where: { id },
      select: {
        amount: true,
        eventId: true,
        schoolId: true,
        _count: { select: { payments: true } },
      },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true, message: "Cotisation introuvable." };
    }
    // Un registre qui contient des versements n'est pas supprimable : on le
    // clôture (les reçus déjà remis doivent rester justifiables).
    if (before._count.payments > 0) {
      return {
        success: false,
        error: true,
        message:
          "Ce registre contient des versements : clôturez-le au lieu de le supprimer.",
      };
    }

    await prisma.eventContribution.delete({ where: { id } });

    await auditWithSession(
      session,
      "contribution.delete",
      `EventContribution#${id}`,
      { before: { amount: before.amount, eventId: before.eventId } }
    );

    revalidatePath(`/list/events/${before.eventId}`);
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// ---------------------------------------------------------------------------
// Versements (EventContributionPayment)
// ---------------------------------------------------------------------------

export const createContributionPayment = async (
  currentState: CurrentState,
  data: ContributionPaymentSchema
) => {
  try {
    const session = await requireSchool(CONTRIB_DESK);
    const { schoolId } = session;

    const contribution = await prisma.eventContribution.findFirst({
      where: { id: data.contributionId, schoolId },
      select: {
        id: true,
        amount: true,
        closedAt: true,
        eventId: true,
        event: { select: { title: true } },
      },
    });
    if (!contribution) return { success: false, error: true };
    // Registre clôturé : aucun versement supplémentaire.
    if (contribution.closedAt) return { success: false, error: true };

    // L'élève doit appartenir à l'école (défense en profondeur).
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, schoolId },
      select: { id: true },
    });
    if (!student) return { success: false, error: true };

    // Référence séquentielle réservée DANS la transaction ; une collision
    // (P2002) sous concurrence est relancée une fois, comme pour les factures.
    const writePayment = async () =>
      prisma.$transaction(async (tx) => {
        const reference = await nextContributionReference(tx);
        return tx.eventContributionPayment.create({
          data: {
            contributionId: data.contributionId,
            studentId: data.studentId,
            amount: data.amount,
            method: data.method ?? "CASH",
            paidAt: data.paidAt ?? new Date(),
            reference,
            note: data.note || null,
            receivedById: session.userId,
          },
        });
      });

    let payment;
    try {
      payment = await writePayment();
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        payment = await writePayment();
      } else {
        throw err;
      }
    }

    await auditWithSession(
      session,
      "contribution.payment",
      `EventContributionPayment#${payment.id}`,
      {
        after: {
          reference: payment.reference,
          studentId: data.studentId,
          amount: data.amount,
          method: data.method ?? "CASH",
          event: contribution.event.title,
        },
      }
    );

    // W12 — accusé aux tuteurs qui peuvent payer. Jamais bloquant.
    try {
      await notifyGuardians([data.studentId], {
        schoolId,
        type: "PAYMENT",
        title: "Cotisation encaissée",
        body: `Versement de ${data.amount.toLocaleString("fr-FR")} FCFA reçu pour « ${contribution.event.title} » (reçu ${payment.reference}).`,
        link: `/list/events/${contribution.eventId}`,
      },
      "canPay");
    } catch (err) {
      console.error("[notify] versement de cotisation non notifié:", err);
    }

    revalidatePath(`/list/events/${contribution.eventId}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/**
 * Annulation d'un versement (erreur de saisie). Le reçu correspondant devient
 * caduc ; l'audit conserve la trace complète de ce qui a été supprimé.
 */
export const deleteContributionPayment = async (
  currentState: DeleteState,
  data: FormData
): Promise<DeleteState> => {
  const id = data.get("id") as string;
  try {
    const session = await requireRole(CONTRIB_DESK);

    const before = await prisma.eventContributionPayment.findUnique({
      where: { id },
      select: {
        reference: true,
        amount: true,
        studentId: true,
        contribution: {
          select: { eventId: true, schoolId: true, closedAt: true },
        },
      },
    });
    if (!before || before.contribution.schoolId !== session.schoolId) {
      return { success: false, error: true, message: "Versement introuvable." };
    }
    if (before.contribution.closedAt) {
      return {
        success: false,
        error: true,
        message: "Registre clôturé : rouvrez-le pour corriger un versement.",
      };
    }

    await prisma.eventContributionPayment.delete({ where: { id } });

    await auditWithSession(
      session,
      "contribution.payment_delete",
      `EventContributionPayment#${id}`,
      {
        before: {
          reference: before.reference,
          amount: before.amount,
          studentId: before.studentId,
        },
      }
    );

    revalidatePath(`/list/events/${before.contribution.eventId}`);
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
