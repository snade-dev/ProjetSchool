import prisma from "./prisma";
import { Prisma } from "@/app/generated/prisma";
import { coversMonth, monthRange } from "./canteen";
import { deriveInvoiceStatus } from "./finance";

/**
 * W11 — Cœur de la génération des factures mensuelles (story-06, adapté aux
 * échéanciers §2.4.2). Extrait de invoiceAction.ts pour être testable hors
 * contexte Next (aucune dépendance session/headers) : l'action serveur
 * generateMonthlyInvoices fait requireRole + audit + revalidate autour.
 */

// Clé d'idempotence d'une facture auto : re-lancer la génération ne duplique rien.
export const genKey = (studentId: string, schoolYearId: number, month: number) =>
  `auto-${studentId}-${schoolYearId}-${month}`;

// Taille des paquets d'écriture : les références séquentielles interdisent un
// createMany naïf, on écrit donc par lots dans un $transaction avec timeout élargi.
const GEN_CHUNK = 25;

// W11 — frais mensuels FACTURABLES pour un mois M donné (§2.4.2) :
//   - frais SANS échéancier → facturé chaque mois (comportement historique) ;
//   - frais AVEC échéancier → facturé uniquement si M figure dans l'échéancier
//     (le montant du mois remplace alors le montant uniforme).
export const monthlyFeeFilter = (schoolYearId: number, month: number) => ({
  period: "MONTHLY" as const,
  schoolYearId,
  OR: [
    { installments: { none: {} } },
    { installments: { some: { month } } },
  ],
});

/**
 * X03 — libellé (préfixe) de la ligne « repas à l'unité » d'une facture. Sert de
 * MARQUEUR : la ligne est retrouvée par ce préfixe pour être recalculée à chaque
 * passage de `billCanteenExtras` (idempotence sans colonne technique).
 */
export const CANTEEN_EXTRA_LABEL = "Cantine — repas à l'unité";

export type GenerationResult = { created: number; ignored: number };

/**
 * Génère les factures mensuelles du mois demandé pour l'année scolaire donnée :
 * une facture par élève inscrit dont la classe a ≥ 1 frais MONTHLY applicable
 * au mois (une ligne InvoiceLine par frais, au montant de l'échéancier s'il
 * existe). Idempotent via `generationKey` unique : relancer ne duplique rien.
 * Une collision de référence (P2002) déclenche UNE relance complète —
 * l'idempotence saute les factures déjà écrites.
 */
export async function runMonthlyGeneration(params: {
  schoolYearId: number;
  month: number;
  year: number;
  createdById: string;
}): Promise<GenerationResult> {
  const { schoolYearId, month, year, createdById } = params;

  // Une passe complète : lecture des facturables + des déjà-générés, réservation
  // du bloc de références, puis écriture par paquets. Rendue idempotente pour
  // pouvoir être relancée telle quelle après un P2002 (collision de référence).
  const runGeneration = async (): Promise<GenerationResult> => {
    // (1) Élèves facturables — UNE requête, frais MONTHLY inclus (pas de N+1).
    // W03 — via les inscriptions de l'année active (Enrollment)
    // W11 — seuls les frais applicables au mois M sont retenus : un frais à
    // échéancier n'est facturé que si M y figure (au montant de CE mois).
    const billableEnrollments = await prisma.enrollment.findMany({
      where: {
        schoolYearId,
        class: {
          feeStructures: {
            some: monthlyFeeFilter(schoolYearId, month),
          },
        },
      },
      include: {
        class: {
          include: {
            feeStructures: {
              where: monthlyFeeFilter(schoolYearId, month),
              // Échéancier restreint au mois M : 1 entrée (montant du mois)
              // ou 0 (frais uniforme, vu le filtre ci-dessus).
              include: { installments: { where: { month } } },
            },
          },
        },
      },
    });
    // (1 bis) X03 — forfaits CANTINE dus au titre du mois (§2.5). Un abonnement
    // ACTIVE dont la prise en charge chevauche le mois donne une ligne :
    //   - forfait MONTHLY → chaque mois couvert ;
    //   - forfait YEARLY / ONE_TIME → UNE seule fois, sur le mois de la date de
    //     début (règle déterministe : l'idempotence du batch est préservée).
    const canteenSubs = await prisma.canteenSubscription.findMany({
      where: { schoolYearId, status: "ACTIVE" },
      select: {
        studentId: true,
        status: true,
        startDate: true,
        endDate: true,
        mealPlan: { select: { name: true, amount: true, period: true } },
      },
    });

    type Line = {
      label: string;
      quantity: number;
      unitAmount: number;
      feeStructureId?: number;
    };
    const canteenLineByStudent = new Map<string, Line>();
    for (const sub of canteenSubs) {
      if (!coversMonth(sub, year, month)) continue;
      if (sub.mealPlan.period !== "MONTHLY") {
        const start = sub.startDate;
        const startsThisMonth =
          start.getUTCFullYear() === year && start.getUTCMonth() + 1 === month;
        if (!startsThisMonth) continue;
      }
      canteenLineByStudent.set(sub.studentId, {
        label: `Cantine — ${sub.mealPlan.name}`,
        quantity: 1,
        unitAmount: sub.mealPlan.amount,
      });
    }

    // (1 ter) Élèves à facturer = ceux qui ont des frais de classe applicables
    // ET/OU un forfait cantine dû ce mois-ci. Un abonné cantine dont la classe
    // n'a aucun frais mensuel reçoit donc bien une facture.
    const linesByStudent = new Map<string, Line[]>();
    for (const e of billableEnrollments) {
      const fees = e.class.feeStructures;
      if (fees.length === 0) continue;
      linesByStudent.set(
        e.studentId,
        fees.map((f) => ({
          label: f.label,
          quantity: 1,
          // W11 — montant du mois si le frais a un échéancier, sinon uniforme.
          unitAmount: f.installments[0]?.amount ?? f.amount,
          feeStructureId: f.id,
        }))
      );
    }
    for (const [studentId, line] of canteenLineByStudent) {
      const existing = linesByStudent.get(studentId);
      if (existing) existing.push(line);
      else linesByStudent.set(studentId, [line]);
    }

    // Défense en profondeur : jamais de facture sans ligne (total 0).
    const students = [...linesByStudent.entries()]
      .filter(([, lines]) => lines.length > 0)
      .map(([id, lines]) => ({ id, lines }));

    if (students.length === 0) {
      return { created: 0, ignored: 0 };
    }

    // (2) generationKey déjà présents pour ce mois → set des élèves déjà facturés.
    const keys = students.map((s) => genKey(s.id, schoolYearId, month));
    const existing = await prisma.invoice.findMany({
      where: { generationKey: { in: keys } },
      select: { generationKey: true },
    });
    const already = new Set(existing.map((e) => e.generationKey));

    const toCreate = students.filter(
      (s) => !already.has(genKey(s.id, schoolYearId, month))
    );
    const ignored = students.length - toCreate.length;

    if (toCreate.length === 0) {
      return { created: 0, ignored };
    }

    // (3) Construction EN MÉMOIRE. Échéance = 5 du mois (attention 0-index JS).
    const dueDate = new Date(year, month - 1, 5);
    // Réservation du bloc de références d'un coup. Base = plus GRANDE référence
    // existante et non un count : les trous (annulations, suppressions) rendent
    // le count collisionnable — même correctif que rollover.ts (W04).
    const prefix = `FAC-${new Date().getFullYear()}-`;
    // NB : des références NON numériques peuvent partager le préfixe (factures
    // legacy `FAC-{année}-L…` de la migration W11) et trier au-dessus des
    // numériques — on prend le max NUMÉRIQUE parmi les dernières références.
    const lastRefs = await prisma.invoice.findMany({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: "desc" },
      select: { reference: true },
      take: 25,
    });
    const base = lastRefs.reduce((max, r) => {
      const n = parseInt(r.reference.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    const payloads = toCreate.map((s, i) => {
      const lines = s.lines;
      const total = lines.reduce(
        (sum, l) => sum + l.quantity * l.unitAmount,
        0
      );
      return {
        reference: `${prefix}${String(base + i + 1).padStart(5, "0")}`,
        status: "ISSUED" as const,
        dueDate,
        month,
        generationKey: genKey(s.id, schoolYearId, month),
        total,
        studentId: s.id,
        schoolYearId,
        createdById,
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

  try {
    return await runGeneration();
  } catch (err) {
    // Collision de référence pendant le batch → relance simple : l'idempotence
    // par generationKey saute les factures déjà écrites et le count de base
    // reflète les références consommées entre-temps.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return await runGeneration();
    }
    throw err;
  }
}

export type ExtrasBillingResult = {
  /** Élèves ayant au moins un repas à l'unité sur le mois. */
  students: number;
  /** Nombre total de repas à l'unité facturés. */
  meals: number;
  /** Montant total facturé (FCFA). */
  amount: number;
  /** Factures créées faute de facture existante pour le mois. */
  invoicesCreated: number;
};

/**
 * X03 — Facture les REPAS À L'UNITÉ (MealAttendance EXTRA) d'un mois (§2.5).
 *
 * Séparé de la génération des forfaits car les extras ne sont connus qu'au fil
 * du mois : la fonction est conçue pour être RELANCÉE (typiquement en fin de
 * mois). Elle est idempotente PAR CONSTRUCTION — la ligne « repas à l'unité »
 * est retrouvée par son libellé (CANTEEN_EXTRA_LABEL) et RECALCULÉE à partir du
 * pointage courant : relancer après de nouveaux pointages met la ligne à jour au
 * lieu d'en ajouter une seconde.
 *
 * Le total de la facture est recalculé depuis ses lignes et son statut redérivé
 * (deriveInvoiceStatus) : une facture déjà soldée qui reçoit des extras
 * repasse correctement en ISSUED/PARTIALLY_PAID/OVERDUE.
 * Les factures ANNULÉES sont ignorées (on ne ressuscite pas une CANCELLED).
 */
export async function billCanteenExtras(params: {
  schoolId: number;
  schoolYearId: number;
  month: number;
  year: number;
  createdById: string;
}): Promise<ExtrasBillingResult> {
  const { schoolId, schoolYearId, month, year, createdById } = params;
  const range = monthRange(year, month);

  const extras = await prisma.mealAttendance.findMany({
    where: {
      schoolId,
      kind: "EXTRA",
      date: { gte: range.gte, lt: range.lt },
    },
    select: { studentId: true, amount: true },
  });

  // Agrégat par élève : nombre de repas + montant total.
  const byStudent = new Map<string, { meals: number; amount: number }>();
  for (const e of extras) {
    const agg = byStudent.get(e.studentId) ?? { meals: 0, amount: 0 };
    agg.meals += 1;
    agg.amount += e.amount;
    byStudent.set(e.studentId, agg);
  }

  const result: ExtrasBillingResult = {
    students: 0,
    meals: 0,
    amount: 0,
    invoicesCreated: 0,
  };
  if (byStudent.size === 0) return result;

  const studentIds = [...byStudent.keys()];
  const invoices = await prisma.invoice.findMany({
    where: { generationKey: { in: studentIds.map((id) => genKey(id, schoolYearId, month)) } },
    select: {
      id: true,
      studentId: true,
      status: true,
      dueDate: true,
      lines: { select: { id: true, label: true, quantity: true, unitAmount: true } },
      payments: { select: { amount: true } },
    },
  });
  const invoiceByStudent = new Map(invoices.map((i) => [i.studentId, i]));

  // Références des factures à créer (élèves sans facture ce mois-ci) — même
  // réservation de bloc que runMonthlyGeneration (max NUMÉRIQUE, pas un count).
  const missing = studentIds.filter((id) => !invoiceByStudent.has(id));
  const prefix = `FAC-${new Date().getFullYear()}-`;
  let refCounter = 0;
  if (missing.length > 0) {
    const lastRefs = await prisma.invoice.findMany({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: "desc" },
      select: { reference: true },
      take: 25,
    });
    refCounter = lastRefs.reduce((max, r) => {
      const n = parseInt(r.reference.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
  }

  await prisma.$transaction(
    async (tx) => {
      for (const [studentId, agg] of byStudent) {
        const label = `${CANTEEN_EXTRA_LABEL} (${agg.meals})`;
        const invoice = invoiceByStudent.get(studentId);

        if (!invoice) {
          refCounter += 1;
          await tx.invoice.create({
            data: {
              reference: `${prefix}${String(refCounter).padStart(5, "0")}`,
              status: "ISSUED",
              dueDate: new Date(year, month - 1, 5),
              month,
              generationKey: genKey(studentId, schoolYearId, month),
              total: agg.amount,
              studentId,
              schoolYearId,
              createdById,
              lines: {
                create: [
                  { label, quantity: agg.meals, unitAmount: agg.meals > 0 ? Math.round(agg.amount / agg.meals) : 0 },
                ],
              },
            },
          });
          result.invoicesCreated += 1;
        } else {
          if (invoice.status === "CANCELLED") continue;

          const existingLine = invoice.lines.find((l) =>
            l.label.startsWith(CANTEEN_EXTRA_LABEL)
          );
          const unitAmount =
            agg.meals > 0 ? Math.round(agg.amount / agg.meals) : 0;

          if (existingLine) {
            await tx.invoiceLine.update({
              where: { id: existingLine.id },
              data: { label, quantity: agg.meals, unitAmount },
            });
          } else {
            await tx.invoiceLine.create({
              data: {
                invoiceId: invoice.id,
                label,
                quantity: agg.meals,
                unitAmount,
              },
            });
          }

          // Total recalculé depuis les AUTRES lignes + la ligne cantine à jour,
          // puis statut redérivé sur la somme des paiements déjà encaissés.
          const othersTotal = invoice.lines
            .filter((l) => !l.label.startsWith(CANTEEN_EXTRA_LABEL))
            .reduce((sum, l) => sum + l.quantity * l.unitAmount, 0);
          const total = othersTotal + agg.meals * unitAmount;
          const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              total,
              status: deriveInvoiceStatus(paid, total, invoice.dueDate),
            },
          });
        }

        result.students += 1;
        result.meals += agg.meals;
        result.amount += agg.amount;
      }
    },
    { timeout: 30000 }
  );

  return result;
}
