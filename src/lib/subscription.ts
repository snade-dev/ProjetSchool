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

export type SchoolAccessState = {
  /** true = accès au dashboard refusé (école coupée ou abonnement suspendu). */
  blocked: boolean;
  /** raison affichable sur /suspended */
  reason: "SCHOOL_INACTIVE" | "SUBSCRIPTION_SUSPENDED" | null;
  /** statut d'abonnement dérivé (null si l'école n'a pas d'abonnement). */
  status: SubscriptionStatus | null;
  /** échéance affichable (fin d'essai ou de couverture). */
  deadline: Date | null;
  schoolName: string | null;
};

/**
 * V06 — état d'accès d'une école : coupée par le superadmin OU abonnement
 * SUSPENDU → bloquée. Une école SANS abonnement n'est PAS bloquée
 * (parc historique : le blocage ne commence qu'une fois un plan attribué).
 */
export async function getSchoolAccessState(
  schoolId: number
): Promise<SchoolAccessState> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, active: true, subscription: true },
  });
  if (!school) {
    return { blocked: true, reason: "SCHOOL_INACTIVE", status: null, deadline: null, schoolName: null };
  }
  if (!school.active) {
    return {
      blocked: true,
      reason: "SCHOOL_INACTIVE",
      status: null,
      deadline: null,
      schoolName: school.name,
    };
  }
  if (!school.subscription) {
    return { blocked: false, reason: null, status: null, deadline: null, schoolName: school.name };
  }
  const status = await refreshSubscriptionStatus(school.subscription);
  return {
    blocked: status === "SUSPENDED",
    reason: status === "SUSPENDED" ? "SUBSCRIPTION_SUSPENDED" : null,
    status,
    deadline: subscriptionDeadline(school.subscription),
    schoolName: school.name,
  };
}
