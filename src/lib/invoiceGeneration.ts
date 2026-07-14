import prisma from "./prisma";
import { Prisma } from "@/app/generated/prisma";

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
    const students = billableEnrollments
      .map((e) => ({
        id: e.studentId,
        class: e.class,
      }))
      // Défense en profondeur : jamais de facture sans ligne (total 0).
      .filter((s) => s.class.feeStructures.length > 0);

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
      const fees = s.class.feeStructures;
      const lines = fees.map((f) => ({
        label: f.label,
        quantity: 1,
        // W11 — montant du mois si le frais a un échéancier, sinon uniforme.
        unitAmount: f.installments[0]?.amount ?? f.amount,
        feeStructureId: f.id,
      }));
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
