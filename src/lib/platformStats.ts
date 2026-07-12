import "server-only";
import prisma from "./prisma";
import {
  computeSubscriptionStatus,
  subscriptionDeadline,
} from "./subscription";
import type { SubscriptionStatus } from "@/app/generated/prisma";

/**
 * V08 — KPIs de la plateforme (/platform, superadmin).
 * Volumétrie : un abonnement par école → tout tient en une lecture, les
 * statuts sont DÉRIVÉS des dates (source de vérité, cf. lib/subscription).
 */

export type PlatformKpis = {
  /** Revenu mensuel récurrent = Σ prix des plans des abonnements ACTIFS (payés). */
  mrr: number;
  /** Encaissé (abonnements) depuis le début du mois civil courant. */
  monthCollected: number;
  /** Répartition des écoles par statut dérivé (+ sans abonnement). */
  statusCounts: Record<SubscriptionStatus | "NONE", number>;
  /** Prochaines échéances (essai ou couverture), les plus proches d'abord. */
  upcoming: {
    schoolId: number;
    schoolName: string;
    status: SubscriptionStatus;
    deadline: Date;
  }[];
  /** Derniers paiements d'abonnement encaissés. */
  recentPayments: {
    id: number;
    schoolName: string;
    amount: number;
    months: number;
    method: string;
    paidAt: Date;
  }[];
};

export async function getPlatformKpis(): Promise<PlatformKpis> {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [schoolsTotal, subs, monthAgg, payments] = await Promise.all([
    prisma.school.count(),
    prisma.schoolSubscription.findMany({
      include: {
        plan: { select: { priceMonthly: true } },
        school: { select: { id: true, name: true } },
      },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: monthStart } },
    }),
    prisma.subscriptionPayment.findMany({
      orderBy: { paidAt: "desc" },
      take: 5,
      include: {
        subscription: { include: { school: { select: { name: true } } } },
      },
    }),
  ]);

  const statusCounts: PlatformKpis["statusCounts"] = {
    TRIAL: 0,
    ACTIVE: 0,
    PAST_DUE: 0,
    SUSPENDED: 0,
    NONE: schoolsTotal - subs.length,
  };
  let mrr = 0;
  const upcoming: PlatformKpis["upcoming"] = [];

  for (const sub of subs) {
    const status = computeSubscriptionStatus(sub);
    statusCounts[status] += 1;
    if (status === "ACTIVE") mrr += sub.plan.priceMonthly;
    const deadline = subscriptionDeadline(sub);
    // Les suspendues n'ont plus d'« échéance à venir » : elles sont déjà coupées.
    if (deadline && status !== "SUSPENDED") {
      upcoming.push({
        schoolId: sub.school.id,
        schoolName: sub.school.name,
        status,
        deadline,
      });
    }
  }
  upcoming.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  return {
    mrr,
    monthCollected: monthAgg._sum.amount ?? 0,
    statusCounts,
    upcoming: upcoming.slice(0, 5),
    recentPayments: payments.map((p) => ({
      id: p.id,
      schoolName: p.subscription.school.name,
      amount: p.amount,
      months: p.months,
      method: p.method,
      paidAt: p.paidAt,
    })),
  };
}
