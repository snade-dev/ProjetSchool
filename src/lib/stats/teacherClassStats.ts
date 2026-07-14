import "server-only";
import prisma from "@/lib/prisma";
import {
  getClassStats,
  getSubjectAverages,
  getClassTrend,
} from "@/lib/stats/studentStats";

/**
 * Espace enseignant — un résumé par classe où il enseigne (via ses Lessons),
 * bâti sur les services de studentStats. Le semestre retenu pour chaque
 * classe est le dernier où elle a des moyennes ; à défaut, le dernier
 * semestre configuré.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type TeacherClassOverview = {
  classId: number;
  className: string;
  /** Matières que CET enseignant donne dans la classe. */
  mySubjects: string[];
  effectif: number;
  /** Moyenne de classe /20 sur le semestre retenu, null si aucune note. */
  moyenneClasse: number | null;
  /** Taux de réussite (fraction 0..1) sur le semestre retenu. */
  tauxReussite: number | null;
  /** Taux de présence (fraction 0..1), toutes périodes. */
  tauxPresence: number | null;
  /** Nom du semestre retenu pour les chiffres, null si aucun. */
  semesterName: string | null;
  /** Écart de moyenne de classe entre les deux derniers semestres notés. */
  delta: number | null;
  /** Moyennes du semestre retenu pour les matières de cet enseignant. */
  mySubjectAverages: { subjectName: string; average: number }[];
};

export async function getTeacherClassesOverview(
  teacherId: string
): Promise<TeacherClassOverview[]> {
  const lessons = await prisma.lesson.findMany({
    where: { teacherId },
    select: {
      classId: true,
      class: { select: { name: true } },
      subjectId: true,
      subject: { select: { name: true } },
    },
  });
  if (lessons.length === 0) return [];

  // classId → nom + matières de cet enseignant dans la classe.
  const byClass = new Map<
    number,
    { name: string; subjectIds: Set<number>; subjectNames: Set<string> }
  >();
  for (const l of lessons) {
    const entry = byClass.get(l.classId) ?? {
      name: l.class.name,
      subjectIds: new Set<number>(),
      subjectNames: new Set<string>(),
    };
    entry.subjectIds.add(l.subjectId);
    entry.subjectNames.add(l.subject.name);
    byClass.set(l.classId, entry);
  }

  const lastSemester = await prisma.semester.findFirst({
    orderBy: { id: "desc" },
    select: { id: true, name: true },
  });

  const overviews = await Promise.all(
    [...byClass.entries()].map(
      async ([classId, meta]): Promise<TeacherClassOverview> => {
        const mySubjects = [...meta.subjectNames].sort((a, b) =>
          a.localeCompare(b, "fr")
        );

        const trend = await getClassTrend(classId);
        const latest = trend.length > 0 ? trend[trend.length - 1] : null;
        const previous = trend.length > 1 ? trend[trend.length - 2] : null;
        const semesterId = latest?.semesterId ?? lastSemester?.id ?? null;
        const semesterName = latest?.semesterName ?? lastSemester?.name ?? null;

        if (semesterId == null) {
          return {
            classId,
            className: meta.name,
            mySubjects,
            // W03 — effectif = inscriptions (Enrollment) de la classe
            effectif: await prisma.enrollment.count({ where: { classId } }),
            moyenneClasse: null,
            tauxReussite: null,
            tauxPresence: null,
            semesterName: null,
            delta: null,
            mySubjectAverages: [],
          };
        }

        const [stats, subjectAverages] = await Promise.all([
          getClassStats(classId, semesterId),
          getSubjectAverages(classId, semesterId),
        ]);

        return {
          classId,
          className: meta.name,
          mySubjects,
          effectif: stats.effectif,
          moyenneClasse: stats.moyenneClasse,
          tauxReussite: stats.tauxReussite,
          tauxPresence: stats.tauxPresence,
          semesterName,
          delta:
            latest && previous
              ? round2(latest.average - previous.average)
              : null,
          mySubjectAverages: subjectAverages
            .filter((s) => meta.subjectIds.has(s.subjectId))
            .map(({ subjectName, average }) => ({ subjectName, average })),
        };
      }
    )
  );

  return overviews.sort((a, b) =>
    a.className.localeCompare(b.className, "fr")
  );
}
