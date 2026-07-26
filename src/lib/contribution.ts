import "server-only";
import prisma from "./prisma";
import { Prisma } from "@/app/generated/prisma";

/**
 * X05/X06 — Cotisations d'événements (§2.4).
 *
 * Modèle retenu avec le user (25 juil. 2026) : REGISTRE PROPRE À L'ÉVÉNEMENT.
 * L'événement porte un barème (montant attendu par élève) ; les versements sont
 * enregistrés dans son registre, pas dans des factures. Les versements PARTIELS
 * sont autorisés : le statut d'un élève se déduit de la somme de SES versements.
 *
 * Le périmètre de la cotisation est celui de l'événement : `Event.classId`
 * (une classe) ou `null` (toute l'école). Les élèves concernés sont les
 * INSCRITS (Enrollment ACTIVE) de l'année scolaire active — cohérent avec W03.
 */

/** Référence d'un reçu de cotisation : « COT-2026-00042 ». */
export async function nextContributionReference(
  tx: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;
  // Max NUMÉRIQUE et non un count : les trous (suppressions) rendraient le
  // count collisionnable — même correctif que W04/W11 sur les factures.
  const lastRefs = await tx.eventContributionPayment.findMany({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
    take: 25,
  });
  const base = lastRefs.reduce((max, r) => {
    const n = parseInt(r.reference.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(base + 1).padStart(5, "0")}`;
}

export type ContributionStatus = "PAID" | "PARTIAL" | "UNPAID";

export type ContributionRow = {
  studentId: string;
  name: string;
  surname: string;
  username: string;
  className: string | null;
  /** Montant attendu de CET élève (= barème). */
  expected: number;
  /** Somme de ses versements. */
  paid: number;
  /** Reste à verser (jamais négatif à l'affichage : cf. `overpaid`). */
  remaining: number;
  /** Versement supérieur au barème (contribution volontaire supplémentaire). */
  overpaid: number;
  status: ContributionStatus;
  payments: {
    id: string;
    reference: string;
    amount: number;
    method: string;
    paidAt: Date;
    note: string | null;
  }[];
};

export type ContributionRecap = {
  event: {
    id: number;
    title: string;
    startTime: Date;
    className: string | null;
  };
  contribution: {
    id: number;
    amount: number;
    dueDate: Date | null;
    note: string | null;
    closedAt: Date | null;
  };
  rows: ContributionRow[];
  totals: {
    /** Élèves du périmètre. */
    students: number;
    paidStudents: number;
    partialStudents: number;
    unpaidStudents: number;
    /** Total attendu = barème × effectif du périmètre. */
    expected: number;
    /** Total effectivement encaissé (y compris au-delà du barème). */
    collected: number;
    /** Reste à recouvrer (somme des restes, sans compenser les trop-perçus). */
    remaining: number;
    /** Taux de recouvrement en % (0 si rien n'est attendu). */
    rate: number;
  };
  /** Récapitulatif agrégé par classe (§2.4 — lecture par la direction). */
  byClass: {
    className: string;
    students: number;
    paidStudents: number;
    expected: number;
    collected: number;
    remaining: number;
  }[];
};

/**
 * Récapitulatif complet du registre d'un événement (X06).
 * Trois requêtes (événement+barème, élèves du périmètre, versements) ; tous les
 * croisements se font en mémoire — pas de N+1.
 * Retourne null si l'événement n'existe pas, n'appartient pas à l'école, ou
 * n'a pas de barème de cotisation.
 */
export async function getContributionRecap(params: {
  eventId: number;
  schoolId: number;
}): Promise<ContributionRecap | null> {
  const { eventId, schoolId } = params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, schoolId },
    select: {
      id: true,
      title: true,
      startTime: true,
      classId: true,
      class: { select: { name: true } },
      contribution: {
        select: {
          id: true,
          amount: true,
          dueDate: true,
          note: true,
          closedAt: true,
        },
      },
    },
  });
  if (!event || !event.contribution) return null;

  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true, schoolId },
    select: { id: true },
  });
  if (!activeYear) return null;

  // Périmètre : la classe de l'événement, ou toute l'école si classId est null.
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolYearId: activeYear.id,
      status: "ACTIVE",
      student: { schoolId },
      ...(event.classId ? { classId: event.classId } : {}),
    },
    select: {
      studentId: true,
      class: { select: { name: true } },
      student: { select: { name: true, surname: true, username: true } },
    },
    orderBy: [
      { class: { name: "asc" } },
      { student: { name: "asc" } },
      { student: { surname: "asc" } },
    ],
  });

  const payments = await prisma.eventContributionPayment.findMany({
    where: { contributionId: event.contribution.id },
    select: {
      id: true,
      studentId: true,
      reference: true,
      amount: true,
      method: true,
      paidAt: true,
      note: true,
    },
    orderBy: { paidAt: "asc" },
  });
  const paymentsByStudent = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByStudent.get(p.studentId) ?? [];
    list.push(p);
    paymentsByStudent.set(p.studentId, list);
  }

  const expectedEach = event.contribution.amount;

  const rows: ContributionRow[] = enrollments.map((e) => {
    const own = paymentsByStudent.get(e.studentId) ?? [];
    const paid = own.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, expectedEach - paid);
    const overpaid = Math.max(0, paid - expectedEach);
    const status: ContributionStatus =
      paid >= expectedEach ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
    return {
      studentId: e.studentId,
      name: e.student.name,
      surname: e.student.surname,
      username: e.student.username,
      className: e.class?.name ?? null,
      expected: expectedEach,
      paid,
      remaining,
      overpaid,
      status,
      payments: own.map((p) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt,
        note: p.note,
      })),
    };
  });

  const expected = expectedEach * rows.length;
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const totals = {
    students: rows.length,
    paidStudents: rows.filter((r) => r.status === "PAID").length,
    partialStudents: rows.filter((r) => r.status === "PARTIAL").length,
    unpaidStudents: rows.filter((r) => r.status === "UNPAID").length,
    expected,
    collected,
    remaining: rows.reduce((sum, r) => sum + r.remaining, 0),
    rate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
  };

  // Agrégat par classe (l'événement « toute l'école » couvre plusieurs classes).
  const classMap = new Map<string, ContributionRecap["byClass"][number]>();
  for (const r of rows) {
    const key = r.className ?? "Sans classe";
    const entry =
      classMap.get(key) ??
      {
        className: key,
        students: 0,
        paidStudents: 0,
        expected: 0,
        collected: 0,
        remaining: 0,
      };
    entry.students += 1;
    if (r.status === "PAID") entry.paidStudents += 1;
    entry.expected += r.expected;
    entry.collected += r.paid;
    entry.remaining += r.remaining;
    classMap.set(key, entry);
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      className: event.class?.name ?? null,
    },
    contribution: event.contribution,
    rows,
    totals,
    byClass: [...classMap.values()].sort((a, b) =>
      a.className.localeCompare(b.className, "fr")
    ),
  };
}

/** Libellés FR des statuts de cotisation (UI + exports). */
export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  PAID: "Soldé",
  PARTIAL: "Partiel",
  UNPAID: "Non payé",
};
