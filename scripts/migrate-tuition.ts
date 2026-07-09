/**
 * Script one-shot (story-07) : migre les anciens TuitionPayment (déprécié) vers le
 * nouveau modèle Invoice + Payment.
 *
 * Lancement : pnpm tsx scripts/migrate-tuition.ts
 *
 * Pour chaque TuitionPayment, si aucune facture ne porte la clé
 * `legacy-{tuitionId}`, on crée :
 *   - une Invoice (status PAID, month/year copiés, total = round(amount),
 *     1 ligne « Scolarité {mois}/{année} », dueDate = paymentDate) ;
 *   - un Payment lié (amount arrondi, paidAt = paymentDate, method CASH).
 *
 * Idempotent : relancer ne duplique rien (skip si la generationKey existe déjà).
 * Le modèle TuitionPayment et ses données ne sont PAS touchés.
 *
 * NB (parade story-07) : ce script s'exécute HORS contexte Next → l'alias `@/`
 * n'est pas résolvable. On importe donc PrismaClient par CHEMIN RELATIF vers le
 * client généré, et on instancie `new PrismaClient()` (sans extension Accelerate).
 */
import { PrismaClient } from "../src/app/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.tuitionPayment.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Année scolaire de rattachement (FK Invoice.schoolYearId obligatoire) :
  // l'année active, sinon la première disponible (hypothèse H31).
  const schoolYear =
    (await prisma.schoolYear.findFirst({ where: { isActive: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { id: "asc" } }));

  if (!schoolYear) {
    console.error(
      "Aucune année scolaire en base — impossible de migrer. Configurez /settings."
    );
    process.exitCode = 1;
    return;
  }

  let migrated = 0;
  let ignored = 0;
  const rounded: string[] = [];

  for (const tp of payments) {
    const generationKey = `legacy-${tp.id}`;

    const existing = await prisma.invoice.findUnique({
      where: { generationKey },
    });
    if (existing) {
      ignored++;
      continue;
    }

    const amount = Math.round(tp.amount);
    if (amount !== tp.amount) {
      rounded.push(`  ${tp.id} : ${tp.amount} → ${amount}`);
    }

    // Référence déterministe (idempotente) et distincte des factures FAC-YYYY-NNNNN.
    const reference = `FAC-${tp.year}-L${tp.id.slice(0, 8).toUpperCase()}`;
    const label = `Scolarité ${tp.month}/${tp.year}`;

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          reference,
          status: "PAID",
          issueDate: tp.paymentDate,
          dueDate: tp.paymentDate,
          month: tp.month,
          generationKey,
          total: amount,
          studentId: tp.studentId,
          schoolYearId: schoolYear.id,
          createdById: "migration",
          lines: {
            create: [{ label, quantity: 1, unitAmount: amount }],
          },
        },
      });

      await tx.payment.create({
        data: {
          amount,
          method: "CASH",
          paidAt: tp.paymentDate,
          invoiceId: invoice.id,
          receivedById: "migration",
        },
      });
    });

    migrated++;
  }

  console.log("=== Migration TuitionPayment → Invoice/Payment ===");
  console.log(
    `${migrated} migrées / ${ignored} ignorées (sur ${payments.length} paiements de scolarité)`
  );
  if (rounded.length > 0) {
    console.log(`Montants Float arrondis (${rounded.length}) :`);
    console.log(rounded.join("\n"));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
