import "server-only";
import prisma from "./prisma";

/**
 * W09 — Bulletins impactés par un changement de PONDÉRATION dans une classe
 * (coefficient de matière W08 ou homeworkWeight W09).
 *
 * Sémantique COMBINED (§2.3.1 système 3) : seuls les bulletins des périodes
 * TRIMESTER dépendent des coefficients ClassSubject et de homeworkWeight —
 * les bulletins de composition (périodes MONTHLY) sont des moyennes simples
 * et ne sont JAMAIS périmés par ces réglages. Le filtre `system: "TRIMESTER"`
 * est donc structurel : pour une classe TRIMESTER il ne change rien (toutes
 * ses périodes notées sont TRIMESTER), pour une classe COMBINED il épargne
 * les bulletins mensuels.
 */

/** Une période impactée par un changement de pondération. */
export type ImpactedPeriod = {
  semesterId: number;
  semesterName: string;
  bulletins: number; // nb de ResultAverage (= bulletins persistés) de la classe
};

/**
 * ResultAverage impactés : ceux des élèves inscrits dans la classe, sur les
 * périodes TRIMESTER de l'année de la classe (la classe appartient à UNE
 * année, W02). Groupés par période pour l'écran de confirmation.
 */
export const impactedTrimesterAverages = async (
  classId: number,
  schoolYearId: number
) => {
  const rows = await prisma.resultAverage.findMany({
    where: {
      semester: { schoolYearId, system: "TRIMESTER" }, // W09 — cf. en-tête
      student: { enrollments: { some: { classId } } },
    },
    select: {
      id: true,
      semesterId: true,
      semester: { select: { name: true, label: true } },
    },
  });
  const byPeriod = new Map<number, ImpactedPeriod>();
  for (const r of rows) {
    const entry = byPeriod.get(r.semesterId);
    if (entry) entry.bulletins += 1;
    else
      byPeriod.set(r.semesterId, {
        semesterId: r.semesterId,
        semesterName: r.semester.label ?? r.semester.name,
        bulletins: 1,
      });
  }
  return {
    ids: rows.map((r) => r.id),
    periods: [...byPeriod.values()].sort((a, b) => a.semesterId - b.semesterId),
  };
};

/** Marque stale=true les ResultAverage impactés (ids déjà scopés classe/année). */
export const markStale = (ids: number[]) =>
  ids.length > 0
    ? prisma.resultAverage.updateMany({
        where: { id: { in: ids } },
        data: { stale: true },
      })
    : Promise.resolve({ count: 0 });
