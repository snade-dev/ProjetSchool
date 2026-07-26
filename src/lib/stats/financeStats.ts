import "server-only";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";

/**
 * S16 — Service d'agrégation des statistiques financières (E39 `/stats/finance`).
 *
 * Principes (parades story-16) :
 * - CA affiché = ENCAISSÉ (Σ Payment), JAMAIS le facturé. Le facturé ne sert
 *   qu'au taux de recouvrement (encaissé / facturé).
 * - Salaires : seuls les SalaryPayment PAID comptent (esprit trésorerie ;
 *   les PENDING sont exclus du résultat — noté dans l'encadré méthodologique UI).
 * - Bucketing mensuel par clé "YYYY-MM" (jamais par index 0-11 seul) pour ne pas
 *   confondre deux années civiles qui partagent le même numéro de mois.
 * - Année sans données : tous les buckets à 0, aucun NaN (diviseurs gardés).
 *
 * Portée des TOTAUX = l'année scolaire (schoolYearId), pas une fenêtre de dates.
 * Les bornes startDate/endDate ne servent QU'À générer l'axe Sept→Juin du chart
 * (H02). Voir ledger H38 : filtrer les paiements par `paidAt ∈ [start,end]` (comme
 * le suggérait littéralement la fiche) exclurait ici tous les paiements (données
 * legacy datées hors de la fenêtre de l'année active) — on scope donc par
 * `invoice.schoolYearId` pour que chaque tuile égale la somme brute de la table.
 * Volumétrie faible → agrégation en JS (pas de $queryRaw).
 */

const MONTH_LABELS = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

/** Clé de bucket mensuel "YYYY-MM" en UTC (cohérente avec la génération d'axe). */
const monthKey = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export type MonthPoint = {
  /** Clé "YYYY-MM". */
  key: string;
  /** Libellé court FR ("Sept."). */
  label: string;
  encaisse: number;
  facture: number;
  depenses: number;
  salaires: number;
  /** X06 — cotisations d'événements encaissées (recette hors facturation). */
  cotisations: number;
  /** encaisse + cotisations − depenses − salaires (peut être négatif). */
  resultat: number;
};

export type CategoryExpense = {
  categoryId: number;
  name: string;
  amount: number;
  /** Part du total des dépenses, fraction 0..1 (0 si total = 0). */
  pct: number;
};

export type ClassOutstanding = {
  classId: number;
  className: string;
  invoiceCount: number;
  /** Somme des soldes restants des factures non soldées de la classe. */
  amount: number;
  /** Part du total des impayés, fraction 0..1 (0 si total = 0). */
  pct: number;
};

export type FinanceStats = {
  schoolYearId: number;
  months: MonthPoint[];
  totalEncaisse: number;
  totalFacture: number;
  /** encaissé / facturé, fraction 0..1 (0 si facturé = 0). */
  tauxRecouvrement: number;
  totalDepenses: number;
  totalSalaires: number;
  /**
   * X06 — total des cotisations d'événements encaissées sur l'année (§2.4).
   * Recette HORS facturation : elle n'entre donc PAS dans `totalEncaisse` (qui
   * sert au taux de recouvrement encaissé/facturé) mais bien dans le résultat.
   */
  totalCotisations: number;
  /** encaissé + cotisations − dépenses − salaires (PAID). */
  resultat: number;
  expensesByCategory: CategoryExpense[];
  outstandingByClass: ClassOutstanding[];
  totalOutstanding: number;
};

/** Génère l'axe mensuel Sept→Juin (chronologique) depuis les bornes de l'année. */
function buildMonthAxis(start: Date, end: Date): { key: string; label: string }[] {
  const axis: { key: string; label: string }[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth(); // 0-11
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth();
  // Garde-fou : max 24 itérations (bornes incohérentes ne bouclent pas à l'infini).
  let guard = 0;
  while ((y < endY || (y === endY && m <= endM)) && guard < 24) {
    axis.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[m],
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    guard += 1;
  }
  return axis;
}

/**
 * Total des impayés (Σ soldes des factures non PAID / non CANCELLED) de l'année.
 * Réutilisable par S17 (bandeau finance du dashboard admin). Si aucun schoolYearId
 * n'est fourni, prend l'année active (à défaut la première en base) ; 0 si aucune.
 */
export async function getOutstandingTotal(schoolYearId?: number): Promise<number> {
  let yearId = schoolYearId;
  if (yearId == null) {
    // V03 — cloisonnement : année active de l'école de la session uniquement
    const schoolId = (await getSessionInfo())?.schoolId ?? -1;
    const active =
      (await prisma.schoolYear.findFirst({ where: { isActive: true, schoolId } })) ??
      (await prisma.schoolYear.findFirst({ where: { schoolId }, orderBy: { id: "asc" } }));
    if (!active) return 0;
    yearId = active.id;
  }
  const invoices = await prisma.invoice.findMany({
    where: { schoolYearId: yearId, status: { notIn: ["PAID", "CANCELLED"] } },
    select: { total: true, payments: { select: { amount: true } } },
  });
  return invoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, inv.total - paid);
  }, 0);
}

/**
 * Cockpit financier complet d'une année scolaire. Toutes les lectures sont
 * groupées en un seul Promise.all (parade « page < 1s »).
 */
export async function getFinanceStats(
  schoolYearId: number
): Promise<FinanceStats | null> {
  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { id: true, startDate: true, endDate: true, schoolId: true },
  });
  if (!schoolYear) return null;

  const axis = buildMonthAxis(schoolYear.startDate, schoolYear.endDate);

  const [
    payments,
    invoices,
    expenses,
    salaryGroups,
    expenseCatGroups,
    categories,
    outstandingInvoices,
    contributionPayments,
  ] = await Promise.all([
    // Encaissé : paiements des factures de l'année (scope schoolYearId, cf. H38).
    prisma.payment.findMany({
      where: { invoice: { schoolYearId } },
      select: { amount: true, paidAt: true },
    }),
    // Facturé : factures de l'année, hors CANCELLED (bucket sur issueDate).
    prisma.invoice.findMany({
      where: { schoolYearId, status: { not: "CANCELLED" } },
      select: { total: true, issueDate: true },
    }),
    // Dépenses de l'année (bucket sur date).
    prisma.expense.findMany({
      where: { schoolYearId },
      select: { amount: true, date: true },
    }),
    // Salaires PAID par mois/année (month/year natifs → groupBy direct).
    prisma.salaryPayment.groupBy({
      by: ["month", "year"],
      where: { status: "PAID", schoolYearId },
      _sum: { netAmount: true },
    }),
    // Dépenses par catégorie.
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { schoolYearId },
      _sum: { amount: true },
    }),
    prisma.expenseCategory.findMany({ select: { id: true, name: true } }),
    // Impayés : factures non soldées (ni PAID ni CANCELLED) + classe + paiements.
    prisma.invoice.findMany({
      where: { schoolYearId, status: { notIn: ["PAID", "CANCELLED"] } },
      select: {
        total: true,
        payments: { select: { amount: true } },
        // W03 — classe de l'élève = son inscription sur l'année de la facture
        student: {
          select: {
            enrollments: {
              where: { schoolYearId },
              select: { class: { select: { id: true, name: true } } },
              take: 1,
            },
          },
        },
      },
    }),
    // X06 — cotisations d'événements encaissées, scopées par l'ANNÉE
    // D'OUVERTURE du registre (EventContribution.schoolYearId) et non par la
    // date de versement : même raison que pour les factures (H38), un versement
    // encaissé hors de la fenêtre de l'année (vacances, régularisation tardive)
    // doit rester dans le résultat de SON année.
    prisma.eventContributionPayment.findMany({
      where: { contribution: { schoolYearId } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // Buckets mensuels initialisés à 0 sur tout l'axe (aucun trou).
  type Bucket = {
    encaisse: number;
    facture: number;
    depenses: number;
    salaires: number;
    cotisations: number;
  };
  const buckets = new Map<string, Bucket>();
  for (const a of axis) {
    buckets.set(a.key, {
      encaisse: 0,
      facture: 0,
      depenses: 0,
      salaires: 0,
      cotisations: 0,
    });
  }

  let totalEncaisse = 0;
  for (const p of payments) {
    totalEncaisse += p.amount;
    const b = buckets.get(monthKey(p.paidAt));
    if (b) b.encaisse += p.amount;
  }

  let totalFacture = 0;
  for (const inv of invoices) {
    totalFacture += inv.total;
    const b = buckets.get(monthKey(inv.issueDate));
    if (b) b.facture += inv.total;
  }

  let totalDepenses = 0;
  for (const e of expenses) {
    totalDepenses += e.amount;
    const b = buckets.get(monthKey(e.date));
    if (b) b.depenses += e.amount;
  }

  let totalSalaires = 0;
  for (const g of salaryGroups) {
    const amount = g._sum.netAmount ?? 0;
    totalSalaires += amount;
    const key = `${g.year}-${String(g.month).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (b) b.salaires += amount;
  }

  // X06 — cotisations encaissées, bucketées sur la date de versement.
  let totalCotisations = 0;
  for (const c of contributionPayments) {
    totalCotisations += c.amount;
    const b = buckets.get(monthKey(c.paidAt));
    if (b) b.cotisations += c.amount;
  }

  const months: MonthPoint[] = axis.map((a) => {
    const b = buckets.get(a.key)!;
    return {
      key: a.key,
      label: a.label,
      encaisse: b.encaisse,
      facture: b.facture,
      depenses: b.depenses,
      salaires: b.salaires,
      cotisations: b.cotisations,
      resultat: b.encaisse + b.cotisations - b.depenses - b.salaires,
    };
  });

  // Dépenses par catégorie (noms + parts).
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  const expensesByCategory: CategoryExpense[] = expenseCatGroups
    .map((g) => {
      const amount = g._sum.amount ?? 0;
      return {
        categoryId: g.categoryId,
        name: catNames.get(g.categoryId) ?? "—",
        amount,
        pct: totalDepenses > 0 ? amount / totalDepenses : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Impayés par classe (solde = total − Σ paiements), agrégé puis trié desc.
  const classAgg = new Map<
    number,
    { className: string; amount: number; invoiceCount: number }
  >();
  let totalOutstanding = 0;
  for (const inv of outstandingInvoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const solde = Math.max(0, inv.total - paid);
    totalOutstanding += solde;
    // W03 — élève sans inscription sur l'année : compté dans le total, pas par classe
    const cls = inv.student.enrollments[0]?.class;
    if (!cls) continue;
    const cur = classAgg.get(cls.id) ?? {
      className: cls.name,
      amount: 0,
      invoiceCount: 0,
    };
    cur.amount += solde;
    cur.invoiceCount += 1;
    classAgg.set(cls.id, cur);
  }
  const outstandingByClass: ClassOutstanding[] = [...classAgg.entries()]
    .map(([classId, v]) => ({
      classId,
      className: v.className,
      invoiceCount: v.invoiceCount,
      amount: v.amount,
      pct: totalOutstanding > 0 ? v.amount / totalOutstanding : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    schoolYearId,
    months,
    totalEncaisse,
    totalFacture,
    tauxRecouvrement: totalFacture > 0 ? totalEncaisse / totalFacture : 0,
    totalDepenses,
    totalSalaires,
    totalCotisations,
    resultat:
      totalEncaisse + totalCotisations - totalDepenses - totalSalaires,
    expensesByCategory,
    outstandingByClass,
    totalOutstanding,
  };
}
