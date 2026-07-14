import type { EvaluationSystem } from "@/app/generated/prisma";

/**
 * W09 — Sémantique du régime COMBINED (§2.3.1 système 3).
 *
 * Le régime d'évaluation est porté par la CLASSE (Class.evaluationSystem),
 * mais une PÉRIODE (Semester.system) est toujours TRIMESTER ou MONTHLY :
 * - une classe TRIMESTER ne voit que les périodes TRIMESTER de son année ;
 * - une classe MONTHLY ne voit que les périodes MONTHLY ;
 * - une classe COMBINED voit les périodes des DEUX régimes (compositions
 *   mensuelles hors mois de trimestre + trimestres) et produit donc les deux
 *   types de bulletins.
 * Le régime de CALCUL d'un bulletin est décidé par Semester.system, jamais
 * par la classe seule : période MONTHLY → moyenne simple sans coefficient ;
 * période TRIMESTER → coefficients ClassSubject + pondération
 * devoirs/composition (Class.homeworkWeight).
 *
 * Ce module est volontairement sans dépendance serveur : il sert aussi bien
 * aux `where` Prisma (RSC/actions) qu'aux filtres client (formulaires).
 */

/** Systèmes de PÉRIODE visibles pour un régime de classe donné. */
export const periodSystemsFor = (
  system: EvaluationSystem
): ("TRIMESTER" | "MONTHLY")[] =>
  system === "COMBINED" ? ["TRIMESTER", "MONTHLY"] : [system];

/**
 * Fragment `where` Prisma filtrant Semester.system selon le régime de la
 * classe : `{}` pour COMBINED (les deux régimes), `{ system }` sinon.
 * À étaler dans la clause where : `{ ...semesterSystemWhere(sys), schoolId }`.
 */
export const semesterSystemWhere = (
  system: EvaluationSystem
): { system?: "TRIMESTER" | "MONTHLY" } =>
  system === "COMBINED" ? {} : { system };
