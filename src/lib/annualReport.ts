import "server-only";
import prisma from "./prisma";
import { getMention } from "./setting";

/**
 * X07 — Bulletin ANNUEL (modèle fourni par l'école, juillet 2026).
 *
 * Là où `reportCard.ts` produit le bulletin d'UNE période (matière par matière),
 * ce service agrège les PÉRIODES d'une année : une ligne par période
 * (composition mensuelle ou trimestre), la moyenne annuelle, le classement
 * général, et les repères de classe (plus forte / plus faible / moyenne).
 *
 * Il fonctionne pour les DEUX régimes (§2.3.1) : le tableau liste les périodes
 * de l'année quel que soit `Semester.system`. Le modèle fourni est un cas
 * MONTHLY à 6 compositions ; une classe à 3 trimestres produit 3 lignes.
 *
 * Source des moyennes de période : `ResultAverage` (upserté par
 * `buildClassReportCards`). Une période dont l'élève n'a pas de ResultAverage
 * est affichée sans note — le bulletin annuel ne recalcule RIEN, il consolide.
 * Conséquence assumée : il faut avoir généré les bulletins de période avant.
 *
 * Toutes les structures retournées sont sérialisables (aucune Date brute) :
 * le composant PDF ne touche jamais la DB.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mois de la composition, déduit du libellé de la période s'il le porte. */
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * Extrait le mois d'un libellé de période (« Composition de novembre »,
 * « Novembre »…). Retourne le nom capitalisé, ou null si le libellé n'en
 * contient aucun (cas des trimestres : la colonne « Mois » reste vide).
 */
function monthFromLabel(label: string): string | null {
  const lower = label.toLowerCase();
  const found = MONTH_NAMES.find((m) => lower.includes(m));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : null;
}

export type AnnualPeriodLine = {
  semesterId: number;
  /** « 1ère Composition », « 1er trimestre »… (libellé de la période). */
  name: string;
  /** Mois déduit du libellé (colonne « Mois » du modèle), null pour un trimestre. */
  month: string | null;
  /** Moyenne de l'élève sur la période (/20), null si non notée. */
  average: number | null;
  /** Appréciation automatique (GRADE_SCALE), null si non notée. */
  appreciation: string | null;
};

export type AnnualReportData = {
  student: {
    id: string;
    name: string;
    surname: string;
    username: string;
  };
  className: string;
  /** Professeur principal de la classe (« Prof. Titulaire » du modèle). */
  mainTeacher: string | null;
  schoolYearName: string;
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    legalFooter: string | null;
    ministry: string | null;
    academy: string | null;
    countryLine1: string | null;
    countryLine2: string | null;
    city: string | null;
    directorName: string | null;
    directorTitle: string | null;
  } | null;
  periods: AnnualPeriodLine[];
  /** Nombre de périodes effectivement notées (« Nbr de Comp. » du modèle). */
  gradedPeriods: number;
  /** Somme des moyennes de période (colonne TOTAL du modèle). */
  total: number | null;
  /** Moyenne annuelle = total ÷ nombre de périodes notées. */
  annualAverage: number | null;
  /** Rang annuel « standard competition » parmi les élèves notés. */
  rank: number | null;
  /** Effectif noté de la classe (dénominateur du rang : « 1er Sur 8 »). */
  gradedStudentCount: number;
  /** Effectif total de la classe. */
  classSize: number;
  /** Meilleure moyenne annuelle de la classe. */
  classBest: number | null;
  /** Plus faible moyenne annuelle de la classe. */
  classWorst: number | null;
  /** Moyenne annuelle de la classe (moyenne des moyennes annuelles). */
  classAverage: number | null;
  /** Mention automatique sur la moyenne annuelle. */
  mention: string | null;
  // ---- Bilan saisi par le maître / la direction (Enrollment, X07)
  conduct: string | null;
  /** Appréciation du travail — ne figure pas au bulletin, sert au certificat. */
  workAppreciation: string | null;
  annualDecision: string | null;
  annualObservation: string | null;
  /** Retards : saisis à la main (le modèle Attendance ne les porte pas). */
  lateCount: number | null;
  /** Absences comptées depuis les présences réelles (Attendance). */
  absences: number;
  /** Dont absences justifiées (W15). */
  justifiedAbsences: number;
  /** Date de génération, déjà formatée. */
  generatedAt: string;
};

/**
 * Bulletins annuels de TOUS les élèves d'une classe, en un passage (les rangs
 * et les repères de classe imposent de calculer toute la classe de toute façon).
 * Retourne une map studentId → AnnualReportData.
 */
export async function buildClassAnnualReports(
  classId: number
): Promise<Map<string, AnnualReportData>> {
  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      name: true,
      schoolId: true,
      schoolYearId: true,
      supervisor: { select: { name: true, surname: true } },
      schoolYear: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
      enrollments: {
        select: {
          studentId: true,
          conduct: true,
          workAppreciation: true,
          annualDecision: true,
          annualObservation: true,
          lateCount: true,
          student: {
            select: { id: true, name: true, surname: true, username: true },
          },
        },
        orderBy: [
          { student: { name: "asc" } },
          { student: { surname: "asc" } },
        ],
      },
    },
  });
  if (!klass) return new Map();

  const studentIds = klass.enrollments.map((e) => e.studentId);

  const [semesters, averages, school, attendances] = await Promise.all([
    // Périodes de l'ANNÉE de la classe, dans l'ordre chronologique (W02/V01).
    prisma.semester.findMany({
      where: { schoolYearId: klass.schoolYearId },
      select: { id: true, name: true, label: true, order: true, system: true },
      orderBy: [{ order: "asc" }, { id: "asc" }],
    }),
    // Moyennes de période de TOUS les élèves en UNE requête (parade N+1).
    studentIds.length > 0
      ? prisma.resultAverage.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, semesterId: true, average: true },
        })
      : Promise.resolve([]),
    prisma.school.findUnique({ where: { id: klass.schoolId } }),
    // Absences réelles de l'année (Attendance) — les retards n'existent pas
    // dans ce modèle et restent saisis à la main sur l'inscription.
    studentIds.length > 0
      ? prisma.attendance.findMany({
          where: {
            studentId: { in: studentIds },
            present: false,
            date: {
              gte: klass.schoolYear.startDate,
              lte: klass.schoolYear.endDate,
            },
          },
          select: { studentId: true, justified: true },
        })
      : Promise.resolve([]),
  ]);

  const semesterIds = new Set(semesters.map((s) => s.id));
  // average[studentId][semesterId]
  const avgByStudent = new Map<string, Map<number, number>>();
  for (const a of averages) {
    // Les ResultAverage d'autres années sont ignorées : le bulletin est ANNUEL.
    if (!semesterIds.has(a.semesterId)) continue;
    const m = avgByStudent.get(a.studentId) ?? new Map<number, number>();
    m.set(a.semesterId, a.average);
    avgByStudent.set(a.studentId, m);
  }

  const absencesByStudent = new Map<
    string,
    { total: number; justified: number }
  >();
  for (const a of attendances) {
    const cur = absencesByStudent.get(a.studentId) ?? {
      total: 0,
      justified: 0,
    };
    cur.total += 1;
    if (a.justified) cur.justified += 1;
    absencesByStudent.set(a.studentId, cur);
  }

  // ---- Moyenne annuelle par élève = moyenne des moyennes de période notées.
  const annualByStudent = new Map<string, number>();
  const totalByStudent = new Map<string, number>();
  const gradedCountByStudent = new Map<string, number>();
  for (const studentId of studentIds) {
    const m = avgByStudent.get(studentId);
    if (!m || m.size === 0) continue;
    const values = [...m.values()];
    const sum = values.reduce((s, v) => s + v, 0);
    totalByStudent.set(studentId, round2(sum));
    gradedCountByStudent.set(studentId, values.length);
    annualByStudent.set(studentId, round2(sum / values.length));
  }

  // ---- Rangs « standard competition » (1, 2, 2, 4) sur la moyenne annuelle.
  const ranked = [...annualByStudent.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map<string, number>();
  let prevValue: number | null = null;
  let prevRank = 0;
  ranked.forEach(([studentId, value], i) => {
    const rank = prevValue !== null && value === prevValue ? prevRank : i + 1;
    ranks.set(studentId, rank);
    prevValue = value;
    prevRank = rank;
  });

  const annualValues = [...annualByStudent.values()];
  const classBest = annualValues.length > 0 ? Math.max(...annualValues) : null;
  const classWorst = annualValues.length > 0 ? Math.min(...annualValues) : null;
  const classAverage =
    annualValues.length > 0
      ? round2(annualValues.reduce((s, v) => s + v, 0) / annualValues.length)
      : null;

  const schoolData = school
    ? {
        name: school.name,
        address: school.address ?? null,
        phone: school.phone ?? null,
        email: school.email ?? null,
        logo: school.logo ?? null,
        legalFooter: school.legalFooter ?? null,
        ministry: school.ministry ?? null,
        academy: school.academy ?? null,
        countryLine1: school.countryLine1 ?? null,
        countryLine2: school.countryLine2 ?? null,
        city: school.city ?? null,
        directorName: school.directorName ?? null,
        directorTitle: school.directorTitle ?? null,
      }
    : null;

  const mainTeacher = klass.supervisor
    ? `${klass.supervisor.name} ${klass.supervisor.surname}`
    : null;

  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date());

  const reports = new Map<string, AnnualReportData>();
  for (const enrollment of klass.enrollments) {
    const studentId = enrollment.studentId;
    const own = avgByStudent.get(studentId);

    const periods: AnnualPeriodLine[] = semesters.map((s) => {
      const label = s.label ?? s.name;
      const average = own?.get(s.id) ?? null;
      return {
        semesterId: s.id,
        name: label,
        month: monthFromLabel(label),
        average: average != null ? round2(average) : null,
        appreciation: average != null ? getMention(average) : null,
      };
    });

    const annualAverage = annualByStudent.get(studentId) ?? null;
    const abs = absencesByStudent.get(studentId) ?? {
      total: 0,
      justified: 0,
    };

    reports.set(studentId, {
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
        surname: enrollment.student.surname,
        username: enrollment.student.username,
      },
      className: klass.name,
      mainTeacher,
      schoolYearName: klass.schoolYear.name,
      school: schoolData,
      periods,
      gradedPeriods: gradedCountByStudent.get(studentId) ?? 0,
      total: totalByStudent.get(studentId) ?? null,
      annualAverage,
      rank: ranks.get(studentId) ?? null,
      gradedStudentCount: annualByStudent.size,
      classSize: klass.enrollments.length,
      classBest,
      classWorst,
      classAverage,
      mention: annualAverage != null ? getMention(annualAverage) : null,
      conduct: enrollment.conduct,
      workAppreciation: enrollment.workAppreciation,
      annualDecision: enrollment.annualDecision,
      annualObservation: enrollment.annualObservation,
      lateCount: enrollment.lateCount,
      absences: abs.total,
      justifiedAbsences: abs.justified,
      generatedAt,
    });
  }

  return reports;
}

/**
 * Bulletin annuel d'UN élève sur UNE année scolaire. Passe par la classe de son
 * inscription de cette année (W03) : les années passées restent correctes.
 * Retourne null si l'élève n'était pas inscrit cette année-là.
 */
export async function buildAnnualReport(
  studentId: string,
  schoolYearId: number
): Promise<AnnualReportData | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    select: { classId: true },
  });
  if (!enrollment) return null;

  const reports = await buildClassAnnualReports(enrollment.classId);
  return reports.get(studentId) ?? null;
}
