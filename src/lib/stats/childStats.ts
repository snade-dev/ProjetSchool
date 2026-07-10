import "server-only";
import prisma from "@/lib/prisma";
import { GRADE_SCALE } from "@/lib/setting";

/**
 * Vue parent — agrégats par enfant (même discipline que studentStats.ts) :
 * - agrégations Prisma (groupBy/aggregate/count), jamais tous les Results en JS ;
 * - aucun NaN : chaque division est gardée par un count > 0 (null sinon) ;
 * - sorties 100 % sérialisables.
 *
 * NB : le modèle ne conserve pas l'historique de classe d'un élève ; la
 * progression « entre les classes/années » est donc lue au travers des
 * semestres successifs (ResultAverage), ordonnés par id.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Note combinée d'un Result, alignée sur studentStats (H17 agrégé). */
const combine = (score: number | null, classScore: number | null) =>
  score != null && classScore != null
    ? (score + classScore) / 2
    : score != null
    ? score
    : classScore ?? null;

export type ChildTrendPoint = {
  semesterId: number;
  semesterName: string;
  average: number;
};

export type ChildSubjectRow = {
  subjectId: number;
  subjectName: string;
  /** Moyenne de l'enfant /20 dans la matière (dernier semestre noté). */
  studentAvg: number;
  /** Moyenne de la classe /20 dans la matière, null si non calculable. */
  classAvg: number | null;
};

export type ChildOverview = {
  /** Moyenne générale par semestre, ordre chronologique (id asc). */
  trend: ChildTrendPoint[];
  /** Dernier semestre noté, null si aucune moyenne. */
  latest: ChildTrendPoint | null;
  /** Écart de moyenne générale entre les deux derniers semestres notés. */
  delta: number | null;
  /** Rang dans la classe sur le dernier semestre noté (parmi les élèves notés). */
  rank: { rank: number; of: number } | null;
  /** Notes par matière (dernier semestre noté) avec la moyenne de classe en repère. */
  subjects: ChildSubjectRow[];
  /** Assiduité globale de l'enfant. */
  attendance: { present: number; total: number; rate: number | null };
};

export async function getChildOverview(
  studentId: string,
  classId: number
): Promise<ChildOverview> {
  // Moyennes générales de l'enfant, tous semestres (peu de lignes : 1/semestre).
  const [averages, presence] = await Promise.all([
    prisma.resultAverage.findMany({
      where: { studentId },
      select: {
        semesterId: true,
        average: true,
        semester: { select: { name: true } },
      },
      orderBy: { semesterId: "asc" },
    }),
    prisma.attendance.groupBy({
      by: ["present"],
      where: { studentId },
      _count: { _all: true },
    }),
  ]);

  let present = 0;
  let total = 0;
  for (const g of presence) {
    total += g._count._all;
    if (g.present) present += g._count._all;
  }
  const attendance = {
    present,
    total,
    rate: total > 0 ? present / total : null,
  };

  const trend: ChildTrendPoint[] = averages.map((a) => ({
    semesterId: a.semesterId,
    semesterName: a.semester.name,
    average: round2(a.average),
  }));
  const latest = trend.length > 0 ? trend[trend.length - 1] : null;
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;
  const delta =
    latest && previous ? round2(latest.average - previous.average) : null;

  if (!latest) {
    return { trend, latest, delta, rank: null, subjects: [], attendance };
  }

  // Camarades de classe (ids) pour le rang et les repères de classe.
  const classmates = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });
  const classmateIds = classmates.map((s) => s.id);

  const [better, graded, childResults, classBySubject] = await Promise.all([
    prisma.resultAverage.count({
      where: {
        semesterId: latest.semesterId,
        studentId: { in: classmateIds },
        average: { gt: latest.average },
      },
    }),
    prisma.resultAverage.count({
      where: {
        semesterId: latest.semesterId,
        studentId: { in: classmateIds },
      },
    }),
    prisma.result.findMany({
      where: { studentId, semesterId: latest.semesterId },
      select: {
        subjectId: true,
        score: true,
        classScore: true,
        subject: { select: { name: true } },
      },
    }),
    prisma.result.groupBy({
      by: ["subjectId"],
      where: {
        semesterId: latest.semesterId,
        studentId: { in: classmateIds },
      },
      _avg: { score: true, classScore: true },
      _count: { _all: true },
    }),
  ]);

  const classAvgMap = new Map<number, number | null>();
  for (const g of classBySubject) {
    const combined = combine(g._avg.score, g._avg.classScore);
    classAvgMap.set(g.subjectId, combined != null ? round2(combined) : null);
  }

  const subjects: ChildSubjectRow[] = childResults
    .map((r) => {
      const combined = combine(r.score, r.classScore);
      return combined == null
        ? null
        : {
            subjectId: r.subjectId,
            subjectName: r.subject.name,
            studentAvg: round2(combined),
            classAvg: classAvgMap.get(r.subjectId) ?? null,
          };
    })
    .filter((r): r is ChildSubjectRow => r !== null)
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "fr"));

  return {
    trend,
    latest,
    delta,
    rank: graded > 0 ? { rank: better + 1, of: graded } : null,
    subjects,
    attendance,
  };
}

/* ------------------------------------------------------------------ */
/* Suggestions — moteur de règles, en français, jamais plus de 5       */
/* ------------------------------------------------------------------ */

export type Suggestion = {
  tone: "warn" | "info" | "good";
  text: string;
};

const fmt = (n: number) => n.toFixed(2).replace(".", ",").replace(/,?0+$/, "");

/**
 * Conseils dérivés des chiffres (aucun appel externe) :
 * matières faibles ou sous la classe, baisse/hausse entre semestres,
 * assiduité, points forts. Priorité aux alertes, plafonné à 5 entrées.
 */
export function buildChildSuggestions(o: ChildOverview): Suggestion[] {
  if (!o.latest) {
    return [
      {
        tone: "info",
        text: "Aucune note enregistrée pour l'instant. Les conseils apparaîtront dès la publication des premières moyennes.",
      },
    ];
  }

  const warns: Suggestion[] = [];
  const infos: Suggestion[] = [];
  const goods: Suggestion[] = [];

  // Matières sous la barre des 10 (les 2 plus faibles).
  const weak = o.subjects
    .filter((s) => s.studentAvg < GRADE_SCALE.pass)
    .sort((a, b) => a.studentAvg - b.studentAvg)
    .slice(0, 2);
  for (const s of weak) {
    const gap =
      s.classAvg != null && s.classAvg - s.studentAvg >= 1
        ? ` (la classe est à ${fmt(s.classAvg)}/20)`
        : "";
    warns.push({
      tone: "warn",
      text: `${s.subjectName} : ${fmt(s.studentAvg)}/20${gap}. Reprendre les leçons après chaque cours, refaire les exercices et demander un accompagnement à l'enseignant.`,
    });
  }

  // Matière au-dessus de 10 mais nettement sous la moyenne de classe.
  const lagging = o.subjects
    .filter(
      (s) =>
        s.studentAvg >= GRADE_SCALE.pass &&
        s.classAvg != null &&
        s.classAvg - s.studentAvg >= 2
    )
    .sort((a, b) => b.classAvg! - b.studentAvg - (a.classAvg! - a.studentAvg))
    .slice(0, 1);
  for (const s of lagging) {
    infos.push({
      tone: "info",
      text: `En ${s.subjectName}, ${fmt(s.studentAvg)}/20 contre ${fmt(
        s.classAvg!
      )}/20 pour la classe : un travail régulier dans cette matière ferait vite la différence.`,
    });
  }

  // Baisse / hausse de la moyenne générale entre les deux derniers semestres.
  if (o.delta != null && o.trend.length > 1) {
    const prev = o.trend[o.trend.length - 2];
    if (o.delta <= -1) {
      warns.push({
        tone: "warn",
        text: `La moyenne générale a baissé de ${fmt(Math.abs(o.delta))} point(s) depuis ${prev.semesterName}. Un point avec l'enseignant principal aiderait à en identifier la cause.`,
      });
    } else if (o.delta >= 1) {
      goods.push({
        tone: "good",
        text: `En progression de +${fmt(o.delta)} point(s) depuis ${prev.semesterName} — encouragez ces efforts, ils paient.`,
      });
    }
  }

  // Assiduité (seulement si assez de pointages pour être significatif).
  if (o.attendance.rate != null && o.attendance.total >= 10 && o.attendance.rate < 0.9) {
    warns.push({
      tone: "warn",
      text: `Présence à ${Math.round(
        o.attendance.rate * 100
      )} % : chaque cours manqué se retrouve dans les notes. Veillez à la régularité et signalez les absences à l'administration.`,
    });
  }

  // Point fort à entretenir.
  const best = [...o.subjects].sort((a, b) => b.studentAvg - a.studentAvg)[0];
  if (best && best.studentAvg >= 14) {
    goods.push({
      tone: "good",
      text: `Point fort : ${best.subjectName} (${fmt(best.studentAvg)}/20) — un appui à entretenir.`,
    });
  }

  // Rien à signaler.
  if (warns.length === 0 && infos.length === 0) {
    if (o.latest.average >= 14) {
      goods.push({
        tone: "good",
        text: "Excellents résultats d'ensemble — continuez le suivi régulier, c'est la bonne recette.",
      });
    } else {
      infos.push({
        tone: "info",
        text: "Résultats équilibrés. Garder un rythme de révision régulier suffit à consolider la moyenne.",
      });
    }
  }

  return [...warns, ...infos, ...goods].slice(0, 5);
}
