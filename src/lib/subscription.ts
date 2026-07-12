import "server-only";
import prisma from "./prisma";
import type { SchoolSubscription, SubscriptionStatus } from "@/app/generated/prisma";

/**
 * V05 — statut d'abonnement DÉRIVÉ des dates (source de vérité), le champ
 * `status` en base n'étant qu'un cache rafraîchi à la lecture :
 * - couvert par un paiement (paidUntil ≥ maintenant)          → ACTIVE
 * - sinon en essai (trialEndsAt ≥ maintenant)                 → TRIAL
 * - sinon échu depuis moins de GRACE_DAYS                     → PAST_DUE
 * - sinon                                                     → SUSPENDED
 */

export const GRACE_DAYS = 15;
const DAY = 24 * 3600 * 1000;

export function computeSubscriptionStatus(
  sub: Pick<SchoolSubscription, "trialEndsAt" | "paidUntil">,
  now: Date = new Date()
): SubscriptionStatus {
  if (sub.paidUntil && sub.paidUntil >= now) return "ACTIVE";
  if (sub.trialEndsAt && sub.trialEndsAt >= now) return "TRIAL";
  const reference = sub.paidUntil ?? sub.trialEndsAt;
  if (!reference) return "SUSPENDED"; // ni essai ni paiement : anormal → coupé
  return now.getTime() - reference.getTime() <= GRACE_DAYS * DAY
    ? "PAST_DUE"
    : "SUSPENDED";
}

/** Recalcule et persiste le statut s'il a changé ; retourne le statut à jour. */
export async function refreshSubscriptionStatus(
  sub: SchoolSubscription
): Promise<SubscriptionStatus> {
  const derived = computeSubscriptionStatus(sub);
  if (derived !== sub.status) {
    await prisma.schoolSubscription.update({
      where: { id: sub.id },
      data: { status: derived },
    });
  }
  return derived;
}

/** Échéance affichable d'un abonnement (fin d'essai ou fin de couverture). */
export function subscriptionDeadline(
  sub: Pick<SchoolSubscription, "trialEndsAt" | "paidUntil">
): Date | null {
  if (sub.paidUntil && sub.trialEndsAt)
    return sub.paidUntil > sub.trialEndsAt ? sub.paidUntil : sub.trialEndsAt;
  return sub.paidUntil ?? sub.trialEndsAt;
}
