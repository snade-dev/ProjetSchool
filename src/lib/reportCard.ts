import "server-only";
import prisma from "./prisma";
import { getMention } from "./setting";

/**
 * S13 — Service de calcul du bulletin scolaire.
 *
 * Toutes les données sont chargées en UNE requête Results par (classe, semestre)
 * (pas de N+1), les calculs se font en mémoire, et les structures retournées sont
 * 100 % sérialisables (aucune Date brute) : le composant PDF ne touche JAMAIS la DB.
 *
 * Formules (H17) :
 * - moyenne matière élève = (classScore + score) / 2 si les deux existent, sinon la note présente ;
 * - moyenne générale = moyenne simple des moyennes matière (pas de coefficients) ;
 * - moyenne de classe (matière) = moyenne des moyennes matière des élèves notés ;
 * - rangs « standard competition » : les ex æquo partagent le rang (1, 2, 2, 4).
 *
 * Effet voulu : upsert de ResultAverage (@@unique(semesterId, studentId)) pour TOUS
 * les élèves notés de la classe (cohérence des moyennes générales persistées).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ReportCardSubjectLine = {
  subjectId: number;
  subjectName: string;
  /** Note de classe /20 (null si absente). */
  classScore: number | null;
  /** Note d'examen /20 (score effectif : rattrapage retenu s'il est meilleur, cf. getResults). */
  examScore: number | null;
  /** Moyenne élève de la matière (H17), null si l'élève n'a aucune note dans la matière. */
  average: number | null;
  /** Moyenne de la classe dans la matière (élèves notés uniquement). */
  classAverage: number | null;
  /** Rang de l'élève dans la matière (standard competition), null si non noté. */
  rank: number | null;
  /** Nombre d'élèves notés dans la matière. */
  gradedCount: number;
  /** Appréciation automatique (GRADE_SCALE), null si non noté. */
  appreciation: string | null;
};

export type ReportCardData = {
  student: { id: string; name: string; surname: string; username: string };
  className: string;
  /** Effectif total de la classe. */
  classSize: number;
  semester: {
    id: number;
    name: string;
    /** V01 — titre complet du document selon le régime de la période. */
    title: string;
  };
  /** Nom de l'année scolaire active ("2025-2026"), null si aucune configurée. */
  schoolYearName: string | null;
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    legalFooter: string | null;
  } | null;
  subjects: ReportCardSubjectLine[];
  /** Moyenne générale /20 (moyenne simple des matières), null si aucune note. */
  generalAverage: number | null;
  /** Rang général (standard competition) parmi les élèves notés, null si non noté. */
  generalRank: number | null;
  /** Effectif noté du semestre (dénominateur du rang général). */
  gradedStudentCount: number;
  /** Mention automatique (GRADE_SCALE), null si non noté. */
  mention: string | null;
  /** Date de génération, déjà formatée (string sérialisable). */
  generatedAt: string;
};

/**
 * Rang « standard competition » (1, 2, 2, 4) sur des valeurs décroissantes.
 * Les valeurs sont comparées à 2 décimales (précision affichée) pour que
 * deux moyennes identiques à l'affichage partagent bien le rang.
 */
function competitionRanks(
  entries: { key: string; value: number }[]
): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const ranks = new Map<string, number>();
  let prevValue: number | null = null;
  let prevRank = 0;
  sorted.forEach((e, i) => {
    const v = round2(e.value);
    const rank = prevValue !== null && v === prevValue ? prevRank : i + 1;
    ranks.set(e.key, rank);
    prevValue = v;
    prevRank = rank;
  });
  return ranks;
}

/** Moyenne matière d'un élève selon H17. */
function subjectAverage(
  examScore: number | null,
  classScore: number | null
): number | null {
  if (examScore != null && classScore != null)
    return (examScore + classScore) / 2;
  if (examScore != null) return examScore;
  if (classScore != null) return classScore;
  return null;
}

/**
 * Calcule les bulletins de TOUS les élèves d'une (classe, semestre) en un
 * passage (une seule requête Results) et upserte leurs ResultAverage.
 * Retourne une map studentId → ReportCardData.
 */
export async function buildClassReportCards(
  classId: number,
  semesterId: number
): Promise<Map<string, ReportCardData>> {
  const [klass, semester, school, activeYear, results] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      select: {
        name: true,
        students: {
          select: { id: true, name: true, surname: true, username: true },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        },
      },
    }),
    prisma.semester.findUnique({
      where: { id: semesterId },
      select: { id: true, name: true, label: true, system: true },
    }),
    // V03 — l'école du bulletin = celle de la classe (fiable même hors session)
    prisma.class
      .findUnique({ where: { id: classId }, select: { schoolId: true } })
      .then((c) =>
        prisma.school.findUnique({ where: { id: c?.schoolId ?? -1 } })
      ),
    prisma.class
      .findUnique({ where: { id: classId }, select: { schoolId: true } })
      .then((c) =>
        prisma.schoolYear.findFirst({
          where: { isActive: true, schoolId: c?.schoolId ?? -1 },
          select: { name: true },
        })
      ),
    // TOUS les Results du couple (classe, semestre) en UNE requête (parade N+1).
    prisma.result.findMany({
      where: { semesterId, student: { classId } },
      include: {
        subject: { select: { id: true, name: true } },
        makeupExam: { select: { score: true } },
      },
    }),
  ]);

  if (!klass || !semester) return new Map();

  // ---- Agrégation par matière : subjectId → { name, par élève { classScore, examScore, average } }
  type Cell = { classScore: number | null; examScore: number | null; average: number };
  const subjectsMap = new Map<
    number,
    { name: string; cells: Map<string, Cell> }
  >();

  for (const r of results) {
    // Score d'examen effectif : le rattrapage remplace s'il est meilleur (aligné sur getResults, H34).
    const makeup = r.makeupExam?.score ?? null;
    const examScore = makeup != null && makeup > r.score ? makeup : r.score;
    const classScore = r.classScore ?? null;
    const avg = subjectAverage(examScore, classScore);
    if (avg == null) continue; // ligne sans aucune note : ignorée (impossible en pratique, score non nul)

    let entry = subjectsMap.get(r.subjectId);
    if (!entry) {
      entry = { name: r.subject.name, cells: new Map() };
      subjectsMap.set(r.subjectId, entry);
    }
    entry.cells.set(r.studentId, { classScore, examScore, average: avg });
  }

  // Matières triées par nom (ordre stable du tableau du bulletin).
  const subjectList = [...subjectsMap.entries()]
    .map(([id, s]) => ({ subjectId: id, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // ---- Par matière : moyenne de classe + rangs matière (standard competition).
  const subjectStats = subjectList.map((s) => {
    const graded = [...s.cells.entries()];
    const classAverage =
      graded.length > 0
        ? round2(
            graded.reduce((sum, [, c]) => sum + c.average, 0) / graded.length
          )
        : null;
    const ranks = competitionRanks(
      graded.map(([studentId, c]) => ({ key: studentId, value: c.average }))
    );
    return { ...s, classAverage, ranks, gradedCount: graded.length };
  });

  // ---- Par élève : moyenne générale (moyenne simple des matières notées).
  const generalAverages = new Map<string, number>();
  for (const student of klass.students) {
    const avgs = subjectStats
      .map((s) => s.cells.get(student.id)?.average)
      .filter((a): a is number => a != null);
    if (avgs.length > 0) {
      generalAverages.set(
        student.id,
        round2(avgs.reduce((sum, a) => sum + a, 0) / avgs.length)
      );
    }
  }

  const generalRanks = competitionRanks(
    [...generalAverages.entries()].map(([key, value]) => ({ key, value }))
  );
  const gradedStudentCount = generalAverages.size;

  // ---- Effet voulu : upsert ResultAverage de tous les élèves notés (cohérence /list/average & S14).
  if (gradedStudentCount > 0) {
    await prisma.$transaction(
      async (tx) => {
        for (const [studentId, average] of generalAverages) {
          await tx.resultAverage.upsert({
            where: { semesterId_studentId: { semesterId, studentId } },
            create: { semesterId, studentId, average },
            update: { average },
          });
        }
      },
      { timeout: 30000 }
    );
  }

  // ---- Assemblage des ReportCardData sérialisables (dates → strings).
  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date());

  const schoolData = school
    ? {
        name: school.name,
        address: school.address ?? null,
        phone: school.phone ?? null,
        email: school.email ?? null,
        logo: school.logo ?? null,
        legalFooter: school.legalFooter ?? null,
      }
    : null;

  const cards = new Map<string, ReportCardData>();
  for (const student of klass.students) {
    const subjects: ReportCardSubjectLine[] = subjectStats.map((s) => {
      const cell = s.cells.get(student.id);
      const average = cell != null ? round2(cell.average) : null;
      return {
        subjectId: s.subjectId,
        subjectName: s.name,
        classScore: cell?.classScore ?? null,
        examScore: cell?.examScore ?? null,
        average,
        classAverage: s.classAverage,
        rank: s.ranks.get(student.id) ?? null,
        gradedCount: s.gradedCount,
        appreciation: average != null ? getMention(average) : null,
      };
    });

    const generalAverage = generalAverages.get(student.id) ?? null;

    cards.set(student.id, {
      student: {
        id: student.id,
        name: student.name,
        surname: student.surname,
        username: student.username,
      },
      className: klass.name,
      classSize: klass.students.length,
      // V01 — titre selon le régime : « Bulletin du 1er trimestre » /
      // « Bulletin — Composition de novembre »
      semester: {
        id: semester.id,
        name: semester.label ?? semester.name,
        title:
          semester.system === "MONTHLY"
            ? `Bulletin — ${semester.label ?? semester.name}`
            : `Bulletin du ${semester.label ?? semester.name}`,
      },
      schoolYearName: activeYear?.name ?? null,
      school: schoolData,
      subjects,
      generalAverage,
      generalRank: generalRanks.get(student.id) ?? null,
      gradedStudentCount,
      mention: generalAverage != null ? getMention(generalAverage) : null,
      generatedAt,
    });
  }

  return cards;
}

/**
 * Bulletin d'UN élève pour un semestre. Charge l'élève + sa classe puis délègue
 * le calcul de toute la classe (nécessaire pour rangs et moyennes de classe).
 * Retourne null si l'élève n'existe pas.
 */
export async function buildReportCard(
  studentId: string,
  semesterId: number
): Promise<ReportCardData | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student) return null;

  const cards = await buildClassReportCards(student.classId, semesterId);
  return cards.get(studentId) ?? null;
}
