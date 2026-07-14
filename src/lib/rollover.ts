import prisma from "./prisma";
import { upsertEnrollment } from "./enrollment";
import { invoiceBalance } from "./finance";
import { Prisma } from "@/app/generated/prisma";

/**
 * W04 — Assistant de passage d'année (§2.1.3) : moteur d'exécution.
 *
 * SÉMANTIQUE DES STATUTS retenue (documentée dans plans/v4-fondations.md) :
 * l'inscription de l'ANCIENNE année reflète l'ISSUE de l'année pour l'élève.
 *   - « Passe »   → l'ancienne inscription RESTE ACTIVE (l'année s'est terminée
 *                   normalement ; le parcours se lit sur l'inscription de la
 *                   NOUVELLE année) + Enrollment ACTIVE sur la nouvelle année.
 *   - « Redouble »→ ancienne inscription marquée REPEATED + Enrollment ACTIVE
 *                   sur une classe de MÊME niveau de la nouvelle année.
 *   - « Sort »    → ancienne inscription marquée LEFT, pas de réinscription.
 *   - « Diplômé » → ancienne inscription marquée GRADUATED (dernier niveau),
 *                   pas de réinscription.
 *
 * IDEMPOTENCE : relancer la validation ne duplique rien —
 *   - classes reconduites : upsert par unicité (schoolId, schoolYearId, name) ;
 *   - frais reconduits    : createMany + skipDuplicates (classId, année, label) ;
 *   - inscriptions        : upsertEnrollment (studentId, schoolYearId) ;
 *   - factures d'arriérés : generationKey unique `rollover-{studentId}-{oldYearId}` ;
 *   - périodes reconduites: unicité (schoolId, schoolYearId, name) — W04 ;
 *   - bascule d'année     : updateMany + update, no-op si déjà faite.
 * Les statuts sont RÉÉCRITS à chaque passage : changer une décision puis
 * relancer fait converger l'état (y compris suppression de l'inscription de la
 * nouvelle année si la décision devient « Sort »/« Diplômé »).
 */

export type RolloverDecisionKind = "PROMOTE" | "REPEAT" | "LEAVE" | "GRADUATE";

export type RolloverDecision = {
  studentId: string;
  decision: RolloverDecisionKind;
  /** Nom de la classe cible sur la NOUVELLE année (PROMOTE/REPEAT uniquement). */
  targetClassName?: string;
};

export type RolloverInput = {
  /** Année qui se clôt — passée EXPLICITEMENT (et non « l'année active ») pour
   * que relancer la validation APRÈS la bascule reste idempotent. */
  oldYearId: number;
  targetYearId: number;
  /** Classes de l'année qui se clôt à recréer sur la nouvelle année. */
  classIdsToCopy: number[];
  decisions: RolloverDecision[];
  /** Reporter les impayés de l'ancienne année (facture « Arriérés … »). */
  carryArrears: boolean;
  /** Reconduire les périodes d'évaluation de l'ancienne année. */
  copyPeriods: boolean;
  /** Basculer la nouvelle année en active (l'ancienne devient inactive). */
  activate: boolean;
};

export type RolloverSummary = {
  classesCreated: number;
  classesExisting: number;
  feesCopied: number;
  promoted: number;
  repeated: number;
  left: number;
  graduated: number;
  arrearsCreated: number;
  arrearsSkipped: number;
  arrearsTotal: number; // FCFA
  cancelledInvoices: number;
  periodsCreated: number;
  activated: boolean;
};

// Taille des paquets d'écriture (mêmes raisons que generateMonthlyInvoices :
// éviter une transaction interminable sur les grosses écoles).
const CHUNK = 50;

const chunked = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Exécute le passage d'année pour une école. Lève une Error à message FR
 * exploitable par l'action appelante. `userId` = créateur des factures.
 */
export async function performRollover(
  schoolId: number,
  userId: string,
  input: RolloverInput
): Promise<RolloverSummary> {
  const summary: RolloverSummary = {
    classesCreated: 0,
    classesExisting: 0,
    feesCopied: 0,
    promoted: 0,
    repeated: 0,
    left: 0,
    graduated: 0,
    arrearsCreated: 0,
    arrearsSkipped: 0,
    arrearsTotal: 0,
    cancelledInvoices: 0,
    periodsCreated: 0,
    activated: false,
  };

  // ---- Années : ancienne (qui se clôt) et nouvelle, toutes deux de l'école ----
  const oldYear = await prisma.schoolYear.findFirst({
    where: { id: input.oldYearId, schoolId },
  });
  if (!oldYear) {
    throw new Error("Année à clôturer introuvable dans votre établissement.");
  }

  const targetYear = await prisma.schoolYear.findFirst({
    where: { id: input.targetYearId, schoolId },
  });
  if (!targetYear) {
    throw new Error("Année cible introuvable dans votre établissement.");
  }
  if (targetYear.id === oldYear.id) {
    throw new Error("L'année cible doit être différente de l'année à clôturer.");
  }

  // ---------------------------------------------------------------------
  // Étape 2 — Reconduction des classes (+ grille des frais, cf. duplicateFees)
  // ---------------------------------------------------------------------
  const sourceClasses = await prisma.class.findMany({
    where: {
      schoolId,
      schoolYearId: oldYear.id,
      id: { in: input.classIdsToCopy },
    },
    include: { feeStructures: { where: { schoolYearId: oldYear.id } } },
  });

  await prisma.$transaction(
    async (tx) => {
      for (const c of sourceClasses) {
        const existing = await tx.class.findUnique({
          where: {
            schoolId_schoolYearId_name: {
              schoolId,
              schoolYearId: targetYear.id,
              name: c.name,
            },
          },
          select: { id: true },
        });

        let targetClassId: number;
        if (existing) {
          summary.classesExisting += 1;
          targetClassId = existing.id;
        } else {
          const created = await tx.class.create({
            data: {
              name: c.name,
              capacity: c.capacity,
              evaluationSystem: c.evaluationSystem,
              homeworkWeight: c.homeworkWeight, // W09 — barème reconduit
              levelId: c.levelId,
              supervisorId: c.supervisorId,
              schoolYearId: targetYear.id,
              schoolId,
            },
            select: { id: true },
          });
          summary.classesCreated += 1;
          targetClassId = created.id;
        }

        // Reconduction des frais — même logique que duplicateFees :
        // l'unicité (classId, schoolYearId, label) + skipDuplicates rendent
        // l'opération idempotente.
        if (c.feeStructures.length > 0) {
          const res = await tx.feeStructure.createMany({
            data: c.feeStructures.map((f) => ({
              label: f.label,
              amount: f.amount,
              period: f.period,
              classId: targetClassId,
              schoolYearId: targetYear.id,
              schoolId,
            })),
            skipDuplicates: true,
          });
          summary.feesCopied += res.count;
        }
      }
    },
    { timeout: 30000 }
  );

  // ---------------------------------------------------------------------
  // Étape 3 — Passage / redoublement / sortie / diplôme
  // ---------------------------------------------------------------------
  // Les classes cibles sont résolues PAR NOM sur la nouvelle année (unicité
  // schoolId+schoolYearId+name) : le client décide avant que les classes
  // reconduites n'existent.
  const targetClasses = await prisma.class.findMany({
    where: { schoolId, schoolYearId: targetYear.id },
    select: { id: true, name: true },
  });
  const targetClassByName = new Map(targetClasses.map((c) => [c.name, c.id]));

  // Inscriptions de l'ancienne année, TOUT statut confondu (hors TRANSFERRED,
  // dont l'issue est déjà actée) : une relance après décisions partielles doit
  // pouvoir corriger un statut déjà écrit.
  const oldEnrollments = await prisma.enrollment.findMany({
    where: {
      schoolYearId: oldYear.id,
      status: { in: ["ACTIVE", "REPEATED", "LEFT", "GRADUATED"] },
      student: { schoolId },
    },
    select: { id: true, studentId: true },
  });
  const oldEnrollmentByStudent = new Map(
    oldEnrollments.map((e) => [e.studentId, e.id])
  );

  // Décisions applicables = celles qui visent une inscription réelle de
  // l'ancienne année (le reste est ignoré : défense en profondeur).
  const applicable = input.decisions.filter((d) =>
    oldEnrollmentByStudent.has(d.studentId)
  );

  // Pré-contrôle : toute décision PROMOTE/REPEAT doit viser une classe
  // existante sur la nouvelle année (reconduite à l'étape 2 ou créée à la main).
  const missingClasses = new Set<string>();
  for (const d of applicable) {
    if (d.decision === "PROMOTE" || d.decision === "REPEAT") {
      if (!d.targetClassName || !targetClassByName.has(d.targetClassName)) {
        missingClasses.add(d.targetClassName ?? "(aucune classe choisie)");
      }
    }
  }
  if (missingClasses.size > 0) {
    throw new Error(
      `Classes cibles introuvables sur ${targetYear.name} : ${[
        ...missingClasses,
      ].join(", ")}. Reconduisez-les à l'étape 2 ou corrigez les décisions.`
    );
  }

  for (const batch of chunked(applicable, CHUNK)) {
    await prisma.$transaction(
      async (tx) => {
        for (const d of batch) {
          const oldEnrollmentId = oldEnrollmentByStudent.get(d.studentId)!;

          if (d.decision === "PROMOTE" || d.decision === "REPEAT") {
            const targetClassId = targetClassByName.get(d.targetClassName!)!;
            // Réinscription en masse : upsertEnrollment (W03) — idempotent.
            await upsertEnrollment(d.studentId, targetClassId, targetYear.id, tx);
            // Statut de l'ancienne inscription : ACTIVE (passe) / REPEATED
            // (redouble) — réécrit explicitement pour converger en cas de
            // relance après changement de décision.
            await tx.enrollment.update({
              where: { id: oldEnrollmentId },
              data: { status: d.decision === "PROMOTE" ? "ACTIVE" : "REPEATED" },
            });
            if (d.decision === "PROMOTE") summary.promoted += 1;
            else summary.repeated += 1;
          } else {
            // Sort / Diplômé : statut final sur l'ancienne inscription, pas de
            // réinscription — et suppression d'une éventuelle inscription déjà
            // créée sur la nouvelle année par une exécution précédente.
            await tx.enrollment.update({
              where: { id: oldEnrollmentId },
              data: { status: d.decision === "LEAVE" ? "LEFT" : "GRADUATED" },
            });
            await tx.enrollment.deleteMany({
              where: { studentId: d.studentId, schoolYearId: targetYear.id },
            });
            if (d.decision === "LEAVE") summary.left += 1;
            else summary.graduated += 1;
          }
        }
      },
      { timeout: 30000 }
    );
  }

  // ---------------------------------------------------------------------
  // Étape 4 — Report des impayés (facture « Arriérés {ancienne année} »)
  // ---------------------------------------------------------------------
  if (input.carryArrears) {
    const reenrolledIds = applicable
      .filter((d) => d.decision === "PROMOTE" || d.decision === "REPEAT")
      .map((d) => d.studentId);

    if (reenrolledIds.length > 0) {
      const runArrears = async () => {
        // Factures ouvertes de l'ancienne année des élèves réinscrits.
        const openInvoices = await prisma.invoice.findMany({
          where: {
            schoolYearId: oldYear.id,
            studentId: { in: reenrolledIds },
            status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
          },
          include: { payments: { select: { amount: true } } },
        });

        // Solde par élève = Σ (total − paiements) des factures ouvertes.
        const byStudent = new Map<string, { balance: number; ids: string[] }>();
        for (const inv of openInvoices) {
          const balance = invoiceBalance(inv);
          if (balance <= 0) continue;
          const entry = byStudent.get(inv.studentId) ?? { balance: 0, ids: [] };
          entry.balance += balance;
          entry.ids.push(inv.id);
          byStudent.set(inv.studentId, entry);
        }

        // Idempotence : clé `rollover-{studentId}-{oldYearId}` déjà consommée
        // = élève déjà reporté (ses anciennes factures sont CANCELLED).
        const keys = [...byStudent.keys()].map(
          (sid) => `rollover-${sid}-${oldYear.id}`
        );
        const existingKeys = new Set(
          (
            await prisma.invoice.findMany({
              where: { generationKey: { in: keys } },
              select: { generationKey: true },
            })
          ).map((i) => i.generationKey)
        );

        const toBill = [...byStudent.entries()].filter(
          ([sid]) => !existingKeys.has(`rollover-${sid}-${oldYear.id}`)
        );
        summary.arrearsSkipped = byStudent.size - toBill.length;
        if (toBill.length === 0) return;

        // Références séquentielles réservées en bloc (convention invoiceRef
        // FAC-{année}-{n° 5 chiffres}). Base = plus GRANDE référence existante
        // (et non un count : les trous/annulations rendraient le count
        // collisionnable, y compris à la re-tentative).
        const prefix = `FAC-${new Date().getFullYear()}-`;
        const last = await prisma.invoice.findFirst({
          where: { reference: { startsWith: prefix } },
          orderBy: { reference: "desc" },
          select: { reference: true },
        });
        const base = last
          ? parseInt(last.reference.slice(prefix.length), 10) || 0
          : 0;

        // Échéance : 30 jours après le début de la nouvelle année (ou après
        // aujourd'hui si l'année a déjà commencé).
        const dueDate = new Date(
          Math.max(Date.now(), targetYear.startDate.getTime()) +
            30 * 24 * 3600 * 1000
        );

        let refIndex = 0;
        for (const batch of chunked(toBill, CHUNK)) {
          await prisma.$transaction(
            async (tx) => {
              for (const [studentId, { balance, ids }] of batch) {
                const reference = `${prefix}${String(base + ++refIndex).padStart(5, "0")}`;
                await tx.invoice.create({
                  data: {
                    reference,
                    status: "ISSUED",
                    dueDate,
                    generationKey: `rollover-${studentId}-${oldYear.id}`,
                    total: balance,
                    studentId,
                    schoolYearId: targetYear.id,
                    createdById: userId,
                    lines: {
                      create: [
                        {
                          label: `Arriérés ${oldYear.name}`,
                          quantity: 1,
                          unitAmount: balance,
                        },
                      ],
                    },
                  },
                });
                // Anciennes factures annulées avec note de traçabilité : le
                // solde vit désormais sur la facture d'arriérés.
                const res = await tx.invoice.updateMany({
                  where: { id: { in: ids } },
                  data: {
                    status: "CANCELLED",
                    reminderNote: `Solde reporté sur ${targetYear.name} (facture ${reference})`,
                  },
                });
                summary.cancelledInvoices += res.count;
                summary.arrearsCreated += 1;
                summary.arrearsTotal += balance;
              }
            },
            { timeout: 30000 }
          );
        }
      };

      try {
        await runArrears();
      } catch (err) {
        // Collision de référence (P2002) sous concurrence : une relance suffit,
        // l'idempotence par generationKey saute ce qui a déjà été écrit.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          await runArrears();
        } else {
          throw err;
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Étape 5 — Reconduction des périodes + bascule d'année
  // ---------------------------------------------------------------------
  if (input.copyPeriods) {
    // Reconduction à l'identique des périodes de l'ancienne année (même nom,
    // régime, ordre, libellé, matières) — possible depuis W04 : l'unicité du
    // nom est désormais (schoolId, schoolYearId, name).
    const [oldSemesters, existingTarget] = await Promise.all([
      prisma.semester.findMany({
        where: { schoolId, schoolYearId: oldYear.id },
        include: { subjects: { select: { id: true } } },
      }),
      prisma.semester.findMany({
        where: { schoolId, schoolYearId: targetYear.id },
        select: { name: true },
      }),
    ]);
    const existingNames = new Set(existingTarget.map((s) => s.name));

    for (const s of oldSemesters) {
      if (existingNames.has(s.name)) continue;
      await prisma.semester.create({
        data: {
          schoolId,
          schoolYearId: targetYear.id,
          name: s.name,
          system: s.system,
          order: s.order,
          label: s.label,
          subjects: { connect: s.subjects.map((subj) => ({ id: subj.id })) },
        },
      });
      summary.periodsCreated += 1;
    }
  }

  if (input.activate) {
    // Invariant : UNE seule année active par école (cf. activateSchoolYear).
    await prisma.$transaction([
      prisma.schoolYear.updateMany({
        where: { schoolId },
        data: { isActive: false },
      }),
      prisma.schoolYear.update({
        where: { id: targetYear.id },
        data: { isActive: true },
      }),
    ]);
    summary.activated = true;
  }

  return summary;
}
