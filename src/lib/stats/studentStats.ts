import "server-only";
import prisma from "@/lib/prisma";
import { GRADE_SCALE } from "@/lib/setting";

/**
 * S14 — Services d'agrégation des statistiques élèves (E37 `/stats/students`).
 *
 * Invariants :
 * - Toutes les agrégations passent par Prisma `groupBy`/`aggregate`/`count` :
 *   JAMAIS de chargement de tous les Results de l'école en JS (cf. stories.md §5).
 * - `groupBy` ne traverse pas les relations → on pré-résout les ids d'élèves de la
 *   classe (`student.findMany({where:{classId}, select:{id}})`) puis on filtre par
 *   `studentId: { in: ids }`.
 * - AUCUN NaN : chaque division est gardée par un `count > 0` (retour `null` sinon).
 * - Sorties 100 % sérialisables (nombres/strings) : consommables par des charts client.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ClassStats = {
  /** Effectif total de la classe. */
  effectif: number;
  /** Nombre d'élèves ayant une moyenne générale (ResultAverage) sur le semestre. */
  gradedCount: number;
  /** Moyenne de classe /20 (moyenne des ResultAverage), null si aucun noté. */
  moyenneClasse: number | null;
  /** Taux de réussite (moyenne >= seuil) sur l'effectif noté, fraction 0..1, null si aucun noté. */
  tauxReussite: number | null;
  /** Taux de présence = présents / pointages enregistrés (H12), fraction 0..1, null si aucun pointage. */
  tauxPresence: number | null;
  /** Nombre de pointages « présent ». */
  presentCount: number;
  /** Nombre total de pointages enregistrés pour la classe. */
  totalCheckins: number;
};

/**
 * Stat-tiles de l'écran : moyenne de classe, taux de réussite, taux de présence, effectif.
 * Moyenne via `resultAverage.aggregate _avg` (alimenté par S13) ; fallback calcul direct
 * sur Result (agrégat _avg des notes) si aucun ResultAverage n'existe encore.
 */
export async function getClassStats(
  classId: number,
  semesterId: number
): Promise<ClassStats> {
  // W03 — les élèves de la classe = ses inscriptions (Enrollment)
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  const effectif = studentIds.length;

  const empty: ClassStats = {
    effectif,
    gradedCount: 0,
    moyenneClasse: null,
    tauxReussite: null,
    tauxPresence: null,
    presentCount: 0,
    totalCheckins: 0,
  };

  // Taux de présence : groupBy(present) sur la classe (H12) — indépendant des notes.
  const presence = await prisma.attendance.groupBy({
    by: ["present"],
    where: { classId },
    _count: { _all: true },
  });
  let presentCount = 0;
  let totalCheckins = 0;
  for (const g of presence) {
    totalCheckins += g._count._all;
    if (g.present) presentCount += g._count._all;
  }
  const tauxPresence = totalCheckins > 0 ? presentCount / totalCheckins : null;

  if (effectif === 0) {
    return { ...empty, tauxPresence, presentCount, totalCheckins };
  }

  // Moyenne de classe + effectif noté via ResultAverage (S13).
  const avgAgg = await prisma.resultAverage.aggregate({
    where: { semesterId, studentId: { in: studentIds } },
    _avg: { average: true },
    _count: { _all: true },
  });
  let gradedCount = avgAgg._count._all;
  let moyenneClasse =
    avgAgg._avg.average != null ? round2(avgAgg._avg.average) : null;
  let tauxReussite: number | null = null;

  if (gradedCount > 0) {
    const passCount = await prisma.resultAverage.count({
      where: {
        semesterId,
        studentId: { in: studentIds },
        average: { gte: GRADE_SCALE.pass },
      },
    });
    tauxReussite = passCount / gradedCount; // gradedCount > 0 garanti
  } else {
    // Fallback : aucun ResultAverage → moyenne directe des Result (agrégat, pas de boucle JS).
    // Approximation (moyenne des notes brutes /20) utilisée uniquement tant que S13
    // n'a pas généré les moyennes ; le taux de réussite reste indéterminé (null).
    const raw = await prisma.result.aggregate({
      where: { semesterId, studentId: { in: studentIds } },
      _avg: { score: true, classScore: true },
      _count: { _all: true },
    });
    if (raw._count._all > 0) {
      const s = raw._avg.score;
      const c = raw._avg.classScore;
      const combined =
        s != null && c != null ? (s + c) / 2 : s != null ? s : c;
      moyenneClasse = combined != null ? round2(combined) : null;
    }
  }

  return {
    effectif,
    gradedCount,
    moyenneClasse,
    tauxReussite,
    tauxPresence,
    presentCount,
    totalCheckins,
  };
}

export type SubjectAverage = {
  subjectId: number;
  subjectName: string;
  /** Moyenne de la matière /20 (moyenne des notes des élèves de la classe). */
  average: number;
  /** Nombre de Result agrégés pour cette matière. */
  count: number;
};

/**
 * Moyenne par matière : `result.groupBy(["subjectId"], _avg)` filtré sur les élèves
 * de la classe, puis jointure des noms de matières (pré-résolus car groupBy ne
 * traverse pas la relation `subject`).
 * Moyenne matière = (avg(score) + avg(classScore)) / 2 si les deux existent,
 * sinon la note présente (aligné sur H17 au niveau agrégé).
 */
export async function getSubjectAverages(
  classId: number,
  semesterId: number
): Promise<SubjectAverage[]> {
  // W03 — les élèves de la classe = ses inscriptions (Enrollment)
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0) return [];

  const grouped = await prisma.result.groupBy({
    by: ["subjectId"],
    where: { semesterId, studentId: { in: studentIds } },
    _avg: { score: true, classScore: true },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const subjects = await prisma.subject.findMany({
    where: { id: { in: grouped.map((g) => g.subjectId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(subjects.map((s) => [s.id, s.name]));

  return grouped
    .map((g) => {
      const s = g._avg.score;
      const c = g._avg.classScore;
      const combined =
        s != null && c != null ? (s + c) / 2 : s != null ? s : c ?? 0;
      return {
        subjectId: g.subjectId,
        subjectName: nameMap.get(g.subjectId) ?? "—",
        average: round2(combined),
        count: g._count._all,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "fr"));
}

export type RankedStudent = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  average: number;
};

/**
 * Top 5 / Flop 5 par moyenne générale (ResultAverage), avec l'élève inclus pour
 * le lien vers sa fiche. Deux findMany symétriques (desc / asc).
 */
export async function getTopFlop(
  classId: number,
  semesterId: number
): Promise<{ top: RankedStudent[]; flop: RankedStudent[] }> {
  // W03 — les élèves de la classe = ses inscriptions (Enrollment)
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0) return { top: [], flop: [] };

  const select = {
    student: {
      select: { id: true, name: true, surname: true, img: true },
    },
  } as const;
  const where = { semesterId, studentId: { in: studentIds } };

  const [topRows, flopRows] = await Promise.all([
    prisma.resultAverage.findMany({
      where,
      orderBy: { average: "desc" },
      take: 5,
      include: select,
    }),
    prisma.resultAverage.findMany({
      where,
      orderBy: { average: "asc" },
      take: 5,
      include: select,
    }),
  ]);

  const map = (r: (typeof topRows)[number]): RankedStudent => ({
    id: r.student.id,
    name: r.student.name,
    surname: r.student.surname,
    img: r.student.img,
    average: round2(r.average),
  });

  return { top: topRows.map(map), flop: flopRows.map(map) };
}

export type TrendPoint = {
  semesterId: number;
  semesterName: string;
  /** Moyenne de classe /20 sur ce semestre. */
  average: number;
};

/**
 * Évolution de la moyenne de classe par semestre :
 * `resultAverage.groupBy(["semesterId"], _avg)` filtré par la liste d'ids d'élèves
 * de la classe (groupBy ne traverse pas la relation `student`), puis noms de semestres.
 */
export async function getClassTrend(classId: number): Promise<TrendPoint[]> {
  // W03 — les élèves de la classe = ses inscriptions (Enrollment)
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0) return [];

  const grouped = await prisma.resultAverage.groupBy({
    by: ["semesterId"],
    where: { studentId: { in: studentIds } },
    _avg: { average: true },
  });
  if (grouped.length === 0) return [];

  const semesters = await prisma.semester.findMany({
    where: { id: { in: grouped.map((g) => g.semesterId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(semesters.map((s) => [s.id, s.name]));

  return grouped
    .map((g) => ({
      semesterId: g.semesterId,
      semesterName: nameMap.get(g.semesterId) ?? `Semestre ${g.semesterId}`,
      average: g._avg.average != null ? round2(g._avg.average) : 0,
    }))
    .sort((a, b) => a.semesterId - b.semesterId);
}
