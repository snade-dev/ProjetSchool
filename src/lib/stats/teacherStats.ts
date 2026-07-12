import "server-only";
import prisma from "@/lib/prisma";
import { GRADE_SCALE } from "@/lib/setting";

/**
 * S15 — Service d'agrégation des statistiques enseignants (E38 `/stats/teachers`).
 *
 * Attribution (parade story-15) : un Result ne porte PAS de teacherId — l'attribution
 * passe par les Lessons : chaque enseignant possède un ensemble de paires
 * (subjectId, classId). Si DEUX enseignants partagent la même paire, les notes de
 * cette paire comptent pour les deux (assumé, documenté dans l'encadré UI + ledger H37).
 *
 * Formule (H17 par note) : valeur d'une note = (score + classScore)/2 si les deux
 * existent, sinon la note présente. Moyenne enseignant = moyenne PONDÉRÉE par le
 * nombre de notes de ses paires (Σ valeurs / nb de notes), PAS une moyenne de
 * moyennes de classes (sinon une classe de 5 pèserait comme une de 40).
 *
 * Volumétrie : les Results du semestre sont chargés en UNE requête (select minimal)
 * puis agrégés en mémoire par (subjectId, classId) — une école = quelques milliers
 * de lignes, OK (cf. story-15 §1 ; noter une hypothèse au ledger si >50k).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type TeacherSortKey = "average" | "successRate";
export type SortDir = "asc" | "desc";

export type TeacherStat = {
  teacherId: string;
  name: string;
  surname: string;
  img: string | null;
  /** Noms des matières enseignées (paires retenues, filtrées par subjectId le cas échéant). */
  subjects: string[];
  /** Noms des classes enseignées (paires retenues). */
  classes: string[];
  /** Nombre d'élèves distincts notés dans les paires de l'enseignant. */
  gradedStudents: number;
  /** Nombre total de notes agrégées (le poids de la moyenne). */
  noteCount: number;
  /** Moyenne pondérée /20, null si aucune note. */
  average: number | null;
  /** Taux de réussite (moyenne élève ≥ 10 sur ses paires), fraction 0..1, null si aucun élève noté. */
  successRate: number | null;
  /** Nombre de créneaux Lesson hebdomadaires (chaque Lesson porte un jour de semaine). */
  lessonsPerWeek: number;
};

type PairAgg = {
  noteSum: number;
  noteCount: number;
  /** Par élève : somme/nb de ses notes dans la paire (pour le taux de réussite). */
  students: Map<string, { sum: number; count: number }>;
};

export async function getTeacherStats(
  semesterId: number,
  subjectId?: number,
  sort: TeacherSortKey = "average",
  dir: SortDir = "desc",
  /** V03 — cloisonnement : limite enseignants/classes/matières/notes à l'école. */
  schoolId?: number
): Promise<TeacherStat[]> {
  const schoolScope = schoolId != null ? { schoolId } : {};
  const [teachers, lessons, subjects, classes, results] = await Promise.all([
    prisma.teacher.findMany({
      where: schoolScope,
      select: { id: true, name: true, surname: true, img: true },
    }),
    // UNE requête pour toutes les lessons → map enseignant → paires (subjectId, classId).
    prisma.lesson.findMany({
      where: schoolId != null ? { class: { schoolId } } : {},
      select: { teacherId: true, subjectId: true, classId: true },
    }),
    prisma.subject.findMany({ where: schoolScope, select: { id: true, name: true } }),
    prisma.class.findMany({ where: schoolScope, select: { id: true, name: true } }),
    // UNE requête pour les Results du semestre (croisement classe×matière requis,
    // que groupBy(["subjectId"]) ne sait pas produire) → agrégation en mémoire.
    prisma.result.findMany({
      where: {
        semesterId,
        ...(subjectId != null ? { subjectId } : {}),
        ...(schoolId != null ? { student: { schoolId } } : {}),
      },
      select: {
        score: true,
        classScore: true,
        subjectId: true,
        studentId: true,
        student: { select: { classId: true } },
      },
    }),
  ]);

  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));
  const classNames = new Map(classes.map((c) => [c.id, c.name]));

  // Agrégation des notes par paire (subjectId, classId).
  const pairAggs = new Map<string, PairAgg>();
  for (const r of results) {
    const key = `${r.subjectId}:${r.student.classId}`;
    // H17 par note : (score + classScore)/2 si les deux, sinon la note présente.
    const value =
      r.classScore != null ? (r.score + r.classScore) / 2 : r.score;
    let agg = pairAggs.get(key);
    if (!agg) {
      agg = { noteSum: 0, noteCount: 0, students: new Map() };
      pairAggs.set(key, agg);
    }
    agg.noteSum += value;
    agg.noteCount += 1;
    const st = agg.students.get(r.studentId) ?? { sum: 0, count: 0 };
    st.sum += value;
    st.count += 1;
    agg.students.set(r.studentId, st);
  }

  // Map enseignant → paires distinctes + matières/classes + nb de créneaux.
  type TeacherLessons = {
    pairs: Set<string>;
    subjectIds: Set<number>;
    classIds: Set<number>;
    lessonCount: number;
  };
  const byTeacher = new Map<string, TeacherLessons>();
  for (const l of lessons) {
    if (subjectId != null && l.subjectId !== subjectId) continue;
    let tl = byTeacher.get(l.teacherId);
    if (!tl) {
      tl = {
        pairs: new Set(),
        subjectIds: new Set(),
        classIds: new Set(),
        lessonCount: 0,
      };
      byTeacher.set(l.teacherId, tl);
    }
    tl.pairs.add(`${l.subjectId}:${l.classId}`);
    tl.subjectIds.add(l.subjectId);
    tl.classIds.add(l.classId);
    tl.lessonCount += 1;
  }

  const rows: TeacherStat[] = teachers.map((t) => {
    const tl = byTeacher.get(t.id);
    let noteSum = 0;
    let noteCount = 0;
    // Fusion par élève à travers TOUTES les paires de l'enseignant (un élève ayant
    // 2 matières avec le même enseignant compte UNE fois, sur sa moyenne globale).
    const studentTotals = new Map<string, { sum: number; count: number }>();

    if (tl) {
      for (const key of tl.pairs) {
        const agg = pairAggs.get(key);
        if (!agg) continue;
        noteSum += agg.noteSum;
        noteCount += agg.noteCount;
        for (const [sid, st] of agg.students) {
          const cur = studentTotals.get(sid) ?? { sum: 0, count: 0 };
          cur.sum += st.sum;
          cur.count += st.count;
          studentTotals.set(sid, cur);
        }
      }
    }

    const gradedStudents = studentTotals.size;
    let passCount = 0;
    for (const st of studentTotals.values()) {
      if (st.count > 0 && st.sum / st.count >= GRADE_SCALE.pass) passCount += 1;
    }

    const collator = (a: string, b: string) => a.localeCompare(b, "fr");

    return {
      teacherId: t.id,
      name: t.name,
      surname: t.surname,
      img: t.img,
      subjects: tl
        ? [...tl.subjectIds]
            .map((id) => subjectNames.get(id) ?? "—")
            .sort(collator)
        : [],
      classes: tl
        ? [...tl.classIds]
            .map((id) => classNames.get(id) ?? "—")
            .sort(collator)
        : [],
      gradedStudents,
      noteCount,
      // Moyenne pondérée par le nb de notes ; enseignant sans note → null (pas de /0).
      average: noteCount > 0 ? round2(noteSum / noteCount) : null,
      successRate: gradedStudents > 0 ? passCount / gradedStudents : null,
      lessonsPerWeek: tl?.lessonCount ?? 0,
    };
  });

  // Tri : clé demandée, valeurs null TOUJOURS en fin de liste, égalité → nom FR.
  const mul = dir === "asc" ? 1 : -1;
  const byName = (a: TeacherStat, b: TeacherStat) =>
    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, "fr");
  rows.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av == null && bv == null) return byName(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av !== bv) return (av - bv) * mul;
    return byName(a, b);
  });

  return rows;
}
