import { PrismaClient } from "../src/app/generated/prisma";
import { hashPassword } from "better-auth/crypto";

// ============================================================================
// SEED DE DÉMONSTRATION — données réalistes pour tester TOUTES les
// fonctionnalités (v4 W01–W16) sur l'école #1 et l'année active.
// Idempotent : relançable à volonté (upsert / delete-recreate sur les tables
// sans clé unique). Toutes les entités créées portent un id/marqueur "demo-".
//
// Lancement : npm run seed:demo
// Mot de passe de TOUS les comptes de démo : password123
// ============================================================================

const prisma = new PrismaClient();
const SCHOOL_ID = 1;
const PASSWORD = "password123";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Crée (ou met à jour) un compte better-auth connectable + membership. */
async function upsertAccount(input: {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "student" | "parent";
}) {
  const now = new Date("2026-01-05T08:00:00Z");
  await prisma.user.upsert({
    where: { email: input.email },
    update: { role: input.role, schoolId: SCHOOL_ID },
    create: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      schoolId: SCHOOL_ID,
      createdAt: now,
      updatedAt: now,
    },
  });
  const existing = await prisma.account.findFirst({
    where: { userId: input.id, providerId: "credential" },
  });
  if (!existing) {
    await prisma.account.create({
      data: {
        id: `demo-acc-${input.id}`,
        accountId: input.id,
        providerId: "credential",
        userId: input.id,
        password: await hashPassword(PASSWORD),
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  // W06 — la vérité des rattachements
  await prisma.userSchoolMembership.upsert({
    where: {
      userId_schoolId_role: {
        userId: input.id,
        schoolId: SCHOOL_ID,
        role: input.role,
      },
    },
    update: { active: true },
    create: { userId: input.id, schoolId: SCHOOL_ID, role: input.role },
  });
}

/** Note déterministe 8–19 (relançable sans aléatoire). */
const score = (i: number, j: number) => 8 + ((i * 7 + j * 5) % 12);

async function seedDemo() {
  // -------------------------------------------------------------------------
  // Contexte : année active, périodes, classes, matières, admin
  // -------------------------------------------------------------------------
  const year = await prisma.schoolYear.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, isActive: true },
  });
  const trimestre1 = await prisma.semester.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, schoolYearId: year.id, system: "TRIMESTER", order: 1 },
  });
  const trimestre2 = await prisma.semester.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, schoolYearId: year.id, system: "TRIMESTER", order: 2 },
  });
  const trimestre3 = await prisma.semester.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, schoolYearId: year.id, system: "TRIMESTER", order: 3 },
  });
  const classe1 = await prisma.class.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, schoolYearId: year.id, name: "1ère année A" },
  });
  const classe2 = await prisma.class.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, schoolYearId: year.id, name: "2ème année A" },
  });
  const subjects = await prisma.subject.findMany({ where: { schoolId: SCHOOL_ID } });
  const subj = (name: string) => {
    const s = subjects.find((s) => s.name === name);
    if (!s) throw new Error(`Matière introuvable : ${name}`);
    return s;
  };
  const maths = subj("Mathématiques");
  const sciences = subj("Sciences");
  const anglais = subj("Anglais");
  const histoire = subj("Histoire");
  const admin = await prisma.user.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, role: "admin" },
  });
  console.log(`Contexte : année ${year.name}, classes « ${classe1.name} » / « ${classe2.name} », admin ${admin.email}`);

  // -------------------------------------------------------------------------
  // ENSEIGNANTS (2) — compte connectable + profil + matières
  // -------------------------------------------------------------------------
  const teacherDefs = [
    {
      id: "demo-teacher-1", username: "awa.diarra", name: "Awa", surname: "Diarra",
      email: "awa.diarra@demo.school", sex: "FEMALE" as const,
      subjects: [maths.id, sciences.id],
    },
    {
      id: "demo-teacher-2", username: "ibrahim.kone", name: "Ibrahim", surname: "Koné",
      email: "ibrahim.kone@demo.school", sex: "MALE" as const,
      subjects: [anglais.id, histoire.id],
    },
  ];
  for (const t of teacherDefs) {
    await upsertAccount({ id: t.id, email: t.email, name: t.username, role: "teacher" });
    await prisma.teacher.upsert({
      where: { id: t.id },
      update: { subjects: { connect: t.subjects.map((id) => ({ id })) } },
      create: {
        id: t.id, username: t.username, name: t.name, surname: t.surname,
        email: t.email, phone: t.id === "demo-teacher-1" ? "70000001" : "70000002",
        address: "Bamako, Mali", bloodType: "O+", sex: t.sex,
        birthday: new Date("1988-05-14"), schoolId: SCHOOL_ID,
        subjects: { connect: t.subjects.map((id) => ({ id })) },
      },
    });
  }
  // Professeurs principaux des deux classes de démo
  await prisma.class.update({ where: { id: classe1.id }, data: { supervisorId: "demo-teacher-1" } });
  await prisma.class.update({ where: { id: classe2.id }, data: { supervisorId: "demo-teacher-2" } });
  console.log("Enseignants : 2 comptes (awa.diarra@demo.school / ibrahim.kone@demo.school)");

  // -------------------------------------------------------------------------
  // ÉLÈVES (8) — compte connectable + profil + inscription (W03)
  // -------------------------------------------------------------------------
  const studentDefs = [
    { id: "demo-student-1", name: "Aminata", surname: "Sangaré", sex: "FEMALE" as const, classId: classe1.id },
    { id: "demo-student-2", name: "Sékou", surname: "Sangaré", sex: "MALE" as const, classId: classe1.id },
    { id: "demo-student-3", name: "Mariam", surname: "Touré", sex: "FEMALE" as const, classId: classe1.id },
    { id: "demo-student-4", name: "Oumar", surname: "Cissé", sex: "MALE" as const, classId: classe1.id },
    { id: "demo-student-5", name: "Kadiatou", surname: "Keïta", sex: "FEMALE" as const, classId: classe2.id },
    { id: "demo-student-6", name: "Boubacar", surname: "Keïta", sex: "MALE" as const, classId: classe2.id },
    { id: "demo-student-7", name: "Fanta", surname: "Camara", sex: "FEMALE" as const, classId: classe2.id },
    { id: "demo-student-8", name: "Adama", surname: "Diallo", sex: "MALE" as const, classId: classe2.id },
  ];
  for (let i = 0; i < studentDefs.length; i++) {
    const s = studentDefs[i];
    const username = `${s.name.toLowerCase()}.${s.surname.toLowerCase().replace(/ï/g, "i").replace(/é/g, "e")}`;
    const email = `${username}@demo.school`;
    await upsertAccount({ id: s.id, email, name: username, role: "student" });
    await prisma.student.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, username, name: s.name, surname: s.surname, email,
        address: "Bamako, Mali", bloodType: i % 2 ? "A+" : "O+", sex: s.sex,
        birthday: new Date(`201${5 + (i % 3)}-0${1 + (i % 9)}-1${i % 9}`),
        schoolId: SCHOOL_ID,
      },
    });
    await prisma.enrollment.upsert({
      where: { studentId_schoolYearId: { studentId: s.id, schoolYearId: year.id } },
      update: { classId: s.classId, status: "ACTIVE" },
      create: { studentId: s.id, classId: s.classId, schoolYearId: year.id },
    });
  }
  console.log(`Élèves : 8 comptes (ex. aminata.sangare@demo.school) inscrits en ${classe1.name} / ${classe2.name}`);

  // -------------------------------------------------------------------------
  // PARENTS (3) + tuteurs (W05 StudentGuardian avec droits différenciés)
  // -------------------------------------------------------------------------
  const parentDefs = [
    {
      id: "demo-parent-1", username: "modibo.sangare", name: "Modibo", surname: "Sangaré",
      email: "modibo.sangare@demo.school", phone: "76000001",
      links: [
        { studentId: "demo-student-1", relationship: "père", isLegal: true, canPay: true, canViewGrades: true, canPickup: true },
        { studentId: "demo-student-2", relationship: "père", isLegal: true, canPay: true, canViewGrades: true, canPickup: true },
      ],
    },
    {
      id: "demo-parent-2", username: "salimata.toure", name: "Salimata", surname: "Touré",
      email: "salimata.toure@demo.school", phone: "76000002",
      links: [
        { studentId: "demo-student-3", relationship: "mère", isLegal: true, canPay: true, canViewGrades: true, canPickup: true },
      ],
    },
    {
      id: "demo-parent-3", username: "drissa.keita", name: "Drissa", surname: "Keïta",
      email: "drissa.keita@demo.school", phone: "76000003",
      links: [
        { studentId: "demo-student-5", relationship: "tuteur légal", isLegal: true, canPay: true, canViewGrades: true, canPickup: false },
        { studentId: "demo-student-6", relationship: "tuteur de fait", isLegal: false, canPay: false, canViewGrades: true, canPickup: false },
      ],
    },
  ];
  for (const pDef of parentDefs) {
    await upsertAccount({ id: pDef.id, email: pDef.email, name: pDef.username, role: "parent" });
    await prisma.parent.upsert({
      where: { id: pDef.id },
      update: {},
      create: {
        id: pDef.id, username: pDef.username, name: pDef.name, surname: pDef.surname,
        email: pDef.email, phone: pDef.phone, address: "Bamako, Mali", schoolId: SCHOOL_ID,
      },
    });
    for (const link of pDef.links) {
      await prisma.studentGuardian.upsert({
        where: { studentId_parentId: { studentId: link.studentId, parentId: pDef.id } },
        update: { ...link, parentId: undefined, studentId: undefined } as any,
        create: { ...link, parentId: pDef.id },
      });
    }
  }
  console.log("Parents : 3 comptes (ex. modibo.sangare@demo.school) avec 5 liens tuteur");

  // -------------------------------------------------------------------------
  // W08 — Coefficients par classe (ClassSubject)
  // -------------------------------------------------------------------------
  const coefs = [
    { classId: classe1.id, subjectId: maths.id, coefficient: 4 },
    { classId: classe1.id, subjectId: sciences.id, coefficient: 2 },
    { classId: classe1.id, subjectId: anglais.id, coefficient: 2 },
    { classId: classe1.id, subjectId: histoire.id, coefficient: 1 },
    { classId: classe2.id, subjectId: maths.id, coefficient: 4 },
    { classId: classe2.id, subjectId: sciences.id, coefficient: 3 },
    { classId: classe2.id, subjectId: anglais.id, coefficient: 2 },
    { classId: classe2.id, subjectId: histoire.id, coefficient: 1 },
  ];
  for (const c of coefs) {
    await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId: c.classId, subjectId: c.subjectId } },
      update: { coefficient: c.coefficient },
      create: c,
    });
  }
  console.log("Coefficients : 4 matières × 2 classes");

  // -------------------------------------------------------------------------
  // Emploi du temps — Lessons hebdomadaires (find-or-create par nom)
  // -------------------------------------------------------------------------
  const at = (h: number) => new Date(`2025-09-01T${String(h).padStart(2, "0")}:00:00Z`);
  const lessonDefs = [
    { name: `Maths — ${classe1.name}`, day: "MONDAY" as const, start: 8, end: 10, subjectId: maths.id, classId: classe1.id, teacherId: "demo-teacher-1" },
    { name: `Sciences — ${classe1.name}`, day: "THURSDAY" as const, start: 9, end: 11, subjectId: sciences.id, classId: classe1.id, teacherId: "demo-teacher-1" },
    { name: `Anglais — ${classe1.name}`, day: "TUESDAY" as const, start: 10, end: 12, subjectId: anglais.id, classId: classe1.id, teacherId: "demo-teacher-2" },
    { name: `Histoire — ${classe1.name}`, day: "WEDNESDAY" as const, start: 8, end: 9, subjectId: histoire.id, classId: classe1.id, teacherId: "demo-teacher-2" },
    { name: `Maths — ${classe2.name}`, day: "TUESDAY" as const, start: 8, end: 10, subjectId: maths.id, classId: classe2.id, teacherId: "demo-teacher-1" },
    { name: `Sciences — ${classe2.name}`, day: "FRIDAY" as const, start: 9, end: 11, subjectId: sciences.id, classId: classe2.id, teacherId: "demo-teacher-1" },
    { name: `Anglais — ${classe2.name}`, day: "MONDAY" as const, start: 10, end: 12, subjectId: anglais.id, classId: classe2.id, teacherId: "demo-teacher-2" },
    { name: `Histoire — ${classe2.name}`, day: "THURSDAY" as const, start: 8, end: 9, subjectId: histoire.id, classId: classe2.id, teacherId: "demo-teacher-2" },
  ];
  const lessons: Record<string, number> = {};
  for (const l of lessonDefs) {
    let lesson = await prisma.lesson.findFirst({ where: { name: l.name, classId: l.classId } });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          name: l.name, day: l.day, startTime: at(l.start), endTime: at(l.end),
          subjectId: l.subjectId, classId: l.classId, teacherId: l.teacherId,
        },
      });
    }
    lessons[l.name] = lesson.id;
  }
  console.log("Emploi du temps : 8 cours hebdomadaires");

  // -------------------------------------------------------------------------
  // Examens (compositions) du 1er trimestre + Notes (Result)
  // -------------------------------------------------------------------------
  const examDefs = [
    { title: `Composition Maths T1 — ${classe1.name}`, lesson: `Maths — ${classe1.name}`, start: "2025-12-01T09:00:00Z", end: "2025-12-01T11:00:00Z" },
    { title: `Composition Maths T1 — ${classe2.name}`, lesson: `Maths — ${classe2.name}`, start: "2025-12-02T09:00:00Z", end: "2025-12-02T11:00:00Z" },
  ];
  const examIds: Record<string, number> = {};
  for (const e of examDefs) {
    let exam = await prisma.exam.findFirst({ where: { title: e.title } });
    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          title: e.title, startTime: new Date(e.start), endTime: new Date(e.end),
          lessonId: lessons[e.lesson], semesterId: trimestre1.id,
        },
      });
    }
    examIds[e.title] = exam.id;
  }

  // Notes sur les 3 trimestres — profils variés pour des stats parlantes :
  // forts (Aminata 16, Kadiatou 15), moyens (12-13), en difficulté (7-9).
  // Certains progressent au fil des trimestres, d'autres régressent.
  const BASE = [16, 9, 13, 7, 15, 11, 8, 12]; // niveau général par élève
  const clamp20 = (n: number) => Math.max(2, Math.min(20, n));
  const gradeFor = (i: number, subjIdx: number, semIdx: number) => {
    const variation = ((i * 3 + subjIdx * 5 + semIdx * 2) % 5) - 2; // -2..+2 selon la matière
    const progress = semIdx * ((i % 3) - 1); // -1/0/+1 par trimestre selon l'élève
    return clamp20(BASE[i] + variation + progress);
  };
  const gradedSubjects = [maths, sciences, anglais, histoire];
  // Coefficients (mêmes valeurs que la section W08 ci-dessus) pour la moyenne pondérée
  const coefFor = (classId: number, subjectId: number) =>
    coefs.find((c) => c.classId === classId && c.subjectId === subjectId)?.coefficient ?? 1;
  const trimestres = [trimestre1, trimestre2, trimestre3];
  let resultCount = 0;
  for (let i = 0; i < studentDefs.length; i++) {
    const s = studentDefs[i];
    const mathExam = s.classId === classe1.id
      ? examIds[`Composition Maths T1 — ${classe1.name}`]
      : examIds[`Composition Maths T1 — ${classe2.name}`];
    for (let semIdx = 0; semIdx < trimestres.length; semIdx++) {
      const sem = trimestres[semIdx];
      let weightedSum = 0;
      let weightTotal = 0;
      for (let j = 0; j < gradedSubjects.length; j++) {
        const sc = gradeFor(i, j, semIdx);
        const cs = clamp20(sc + (((i + j + semIdx) % 3) - 1));
        await prisma.result.upsert({
          where: {
            semesterId_studentId_subjectId: {
              semesterId: sem.id, studentId: s.id, subjectId: gradedSubjects[j].id,
            },
          },
          update: { score: sc, classScore: cs },
          create: {
            score: sc,
            classScore: cs,
            examId: semIdx === 0 && gradedSubjects[j].id === maths.id ? mathExam : null,
            studentId: s.id, subjectId: gradedSubjects[j].id, semesterId: sem.id,
          },
        });
        resultCount++;
        const coef = coefFor(s.classId, gradedSubjects[j].id);
        weightedSum += ((sc + cs) / 2) * coef;
        weightTotal += coef;
      }
      // Moyenne générale du trimestre (ResultAverage) — alimente moyenne de
      // classe, taux de réussite, top/flop et courbe d'évolution (/stats/students)
      const average = Math.round((weightedSum / weightTotal) * 100) / 100;
      await prisma.resultAverage.upsert({
        where: { semesterId_studentId: { semesterId: sem.id, studentId: s.id } },
        update: { average, stale: false },
        create: { semesterId: sem.id, studentId: s.id, average },
      });
    }
  }
  console.log(`Notes : ${resultCount} résultats + 24 moyennes générales (3 trimestres × 8 élèves)`);

  // -------------------------------------------------------------------------
  // Présences (2 semaines de mars) + W15 justifications d'absence
  // (pas de clé unique → delete-recreate sur les élèves de démo)
  // -------------------------------------------------------------------------
  const demoStudentIds = studentDefs.map((s) => s.id);
  await prisma.attendance.deleteMany({ where: { studentId: { in: demoStudentIds } } });
  // 4 semaines de jours ouvrés (lun-ven) du 2 au 27 mars 2026
  const schoolDays: string[] = [];
  for (
    let d = new Date("2026-03-02T00:00:00Z");
    d <= new Date("2026-03-27T00:00:00Z");
    d = new Date(d.getTime() + 86_400_000)
  ) {
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) schoolDays.push(d.toISOString().slice(0, 10));
  }
  // Absences ciblées (support des 2 justifications) + absences supplémentaires
  // déterministes, plus fréquentes chez les élèves en difficulté (profil BASE bas).
  const absences: Record<string, string[]> = {
    "demo-student-1": ["2026-03-05", "2026-03-12"],
    "demo-student-3": ["2026-03-09"],
    "demo-student-6": ["2026-03-10"],
  };
  let attendanceCount = 0;
  let absenceCount = 0;
  const absenceIds: Record<string, number> = {}; // "studentId|date" → attendance.id
  for (let i = 0; i < studentDefs.length; i++) {
    const s = studentDefs[i];
    // Période modulée par le niveau : les élèves faibles manquent ~1 jour/semaine,
    // les bons quasiment jamais.
    const absencePeriod = BASE[i] >= 14 ? 0 : BASE[i] >= 11 ? 9 : 5;
    for (let dayIdx = 0; dayIdx < schoolDays.length; dayIdx++) {
      const day = schoolDays[dayIdx];
      const targeted = (absences[s.id] ?? []).includes(day);
      const extra = absencePeriod > 0 && (dayIdx + i * 2) % absencePeriod === 0;
      const present = !targeted && !extra;
      const att = await prisma.attendance.create({
        data: {
          date: new Date(`${day}T08:00:00Z`), present, sessionDay: "MORNING",
          studentId: s.id, classId: s.classId, subjectId: maths.id,
        },
      });
      if (!present) {
        absenceIds[`${s.id}|${day}`] = att.id;
        absenceCount++;
      }
      attendanceCount++;
    }
  }
  // Justification ACCEPTÉE (Mariam, déposée par sa mère) → Absent (justifié)
  const justified = await prisma.absenceJustification.create({
    data: {
      attendanceId: absenceIds["demo-student-3|2026-03-09"],
      parentId: "demo-parent-2",
      reason: "Consultation médicale — certificat fourni.",
      status: "COMPLETED",
      decidedById: admin.id,
      decidedAt: new Date("2026-03-10T10:00:00Z"),
      schoolId: SCHOOL_ID,
    },
  });
  await prisma.attendance.update({ where: { id: justified.attendanceId }, data: { justified: true } });
  // Justification EN ATTENTE (Aminata, déposée par son père)
  await prisma.absenceJustification.create({
    data: {
      attendanceId: absenceIds["demo-student-1|2026-03-12"],
      parentId: "demo-parent-1",
      reason: "Maladie (paludisme), repos prescrit 2 jours.",
      status: "PENDING",
      schoolId: SCHOOL_ID,
    },
  });
  console.log(`Présences : ${attendanceCount} pointages dont ${absenceCount} absences, 2 justifications (1 acceptée, 1 en attente)`);

  // -------------------------------------------------------------------------
  // W14 — Devoirs à faire (delete-recreate sur les auteurs de démo)
  // -------------------------------------------------------------------------
  await prisma.homework.deleteMany({
    where: { schoolId: SCHOOL_ID, teacherId: { in: ["demo-teacher-1", "demo-teacher-2"] } },
  });
  await prisma.homework.createMany({
    data: [
      {
        title: "Exercices sur les fractions",
        content: "Faire les exercices 4 à 9 page 52 du manuel. Revoir la leçon sur la simplification.",
        dueDate: new Date("2026-07-24T18:00:00Z"),
        classId: classe1.id, subjectId: maths.id, teacherId: "demo-teacher-1", schoolId: SCHOOL_ID,
      },
      {
        title: "Lecture chapitre 3 + questions",
        content: "Lire le chapitre 3 et répondre aux 5 questions de compréhension par écrit.",
        dueDate: new Date("2026-07-27T18:00:00Z"),
        classId: classe1.id, subjectId: anglais.id, teacherId: "demo-teacher-2", schoolId: SCHOOL_ID,
      },
      {
        title: "Révision : tables de multiplication",
        content: "Réviser les tables de 6 à 9 pour l'interrogation orale.",
        dueDate: new Date("2026-06-15T18:00:00Z"), // échéance passée
        classId: classe2.id, subjectId: maths.id, teacherId: "demo-teacher-1", schoolId: SCHOOL_ID,
      },
      {
        title: "Exposé : l'empire du Mali",
        content: "Préparer un exposé de 5 minutes par groupe de 2 sur l'empire du Mali.",
        dueDate: new Date("2026-07-30T18:00:00Z"),
        classId: classe2.id, subjectId: histoire.id, teacherId: "demo-teacher-2", schoolId: SCHOOL_ID,
      },
    ],
  });
  console.log("Devoirs : 4 (3 à venir, 1 échu)");

  // -------------------------------------------------------------------------
  // W15 — Observations & discipline (delete-recreate sur les élèves de démo)
  // -------------------------------------------------------------------------
  await prisma.observation.deleteMany({ where: { studentId: { in: demoStudentIds } } });
  await prisma.observation.createMany({
    data: [
      {
        studentId: "demo-student-1", authorId: "demo-teacher-1", kind: "POSITIVE",
        content: "Excellente participation en mathématiques, aide ses camarades.",
        sharedWithParents: true, schoolId: SCHOOL_ID, createdAt: new Date("2026-03-06T11:00:00Z"),
      },
      {
        studentId: "demo-student-2", authorId: "demo-teacher-2", kind: "NEGATIVE",
        content: "Bavardages répétés en classe malgré plusieurs rappels.",
        sharedWithParents: true, schoolId: SCHOOL_ID, createdAt: new Date("2026-03-11T09:30:00Z"),
      },
      {
        studentId: "demo-student-2", authorId: admin.id, kind: "NEUTRAL",
        content: "Entretien avec la direction prévu — à suivre en interne.",
        sharedWithParents: false, // confidentiel : jamais visible parent/élève
        schoolId: SCHOOL_ID, createdAt: new Date("2026-03-12T15:00:00Z"),
      },
      {
        studentId: "demo-student-5", authorId: "demo-teacher-1", kind: "POSITIVE",
        content: "Gros progrès en sciences ce trimestre, travail sérieux.",
        sharedWithParents: true, schoolId: SCHOOL_ID, createdAt: new Date("2026-04-02T10:00:00Z"),
      },
    ],
  });
  console.log("Observations : 4 (dont 1 confidentielle non partagée)");

  // -------------------------------------------------------------------------
  // W16 — Messagerie (delete-recreate sur les participants de démo)
  // -------------------------------------------------------------------------
  const demoUserIds = [
    ...demoStudentIds, "demo-teacher-1", "demo-teacher-2",
    "demo-parent-1", "demo-parent-2", "demo-parent-3",
  ];
  await prisma.message.deleteMany({
    where: { OR: [{ senderId: { in: demoUserIds } }, { receiverId: { in: demoUserIds } }] },
  });
  await prisma.message.createMany({
    data: [
      // Fil parent (Modibo) ↔ enseignante (Awa) au sujet d'Aminata
      {
        schoolId: SCHOOL_ID, senderId: "demo-parent-1", receiverId: "demo-teacher-1",
        content: "Bonjour Madame, Aminata a-t-elle rattrapé le cours de jeudi dernier ?",
        createdAt: new Date("2026-03-13T18:05:00Z"), readAt: new Date("2026-03-13T19:00:00Z"),
      },
      {
        schoolId: SCHOOL_ID, senderId: "demo-teacher-1", receiverId: "demo-parent-1",
        content: "Bonjour, oui, je lui ai remis les exercices. Elle pourra me poser ses questions lundi.",
        createdAt: new Date("2026-03-13T19:10:00Z"), readAt: new Date("2026-03-13T20:00:00Z"),
      },
      {
        schoolId: SCHOOL_ID, senderId: "demo-parent-1", receiverId: "demo-teacher-1",
        content: "Merci beaucoup pour votre suivi !",
        createdAt: new Date("2026-03-13T20:15:00Z"), // non lu → badge côté enseignante
      },
      // Fil enseignant ↔ enseignant
      {
        schoolId: SCHOOL_ID, senderId: "demo-teacher-2", receiverId: "demo-teacher-1",
        content: "Peux-tu me passer la liste des élèves absents de jeudi pour le conseil de classe ?",
        createdAt: new Date("2026-03-16T08:30:00Z"), readAt: new Date("2026-03-16T09:00:00Z"),
      },
      // Fil parent ↔ direction
      {
        schoolId: SCHOOL_ID, senderId: "demo-parent-2", receiverId: admin.id,
        content: "Bonjour, je souhaite un rendez-vous au sujet de la scolarité de Mariam.",
        createdAt: new Date("2026-03-17T10:00:00Z"), // non lu → badge côté direction
      },
    ],
  });
  console.log("Messages : 5 sur 3 fils (parent↔prof, prof↔prof, parent↔direction)");

  // -------------------------------------------------------------------------
  // W12 — Notifications in-app (delete-recreate sur les comptes de démo)
  // -------------------------------------------------------------------------
  await prisma.notification.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.notification.createMany({
    data: [
      {
        userId: "demo-parent-1", schoolId: SCHOOL_ID, type: "ABSENCE",
        title: "Absence d'Aminata", body: "Aminata Sangaré a été notée absente le 12/03/2026 (matin).",
        link: "/list/attendances", createdAt: new Date("2026-03-12T09:00:00Z"),
      },
      {
        userId: "demo-parent-1", schoolId: SCHOOL_ID, type: "HOMEWORK",
        title: "Nouveau devoir en Mathématiques", body: "« Exercices sur les fractions » à rendre pour le 24/07/2026.",
        link: "/list/homeworks", createdAt: new Date("2026-07-17T14:00:00Z"),
      },
      {
        userId: "demo-teacher-1", schoolId: SCHOOL_ID, type: "MESSAGE",
        title: "Nouveau message", body: "Modibo Sangaré vous a envoyé un message.",
        link: "/list/messages", createdAt: new Date("2026-03-13T20:15:00Z"),
      },
      {
        userId: "demo-student-1", schoolId: SCHOOL_ID, type: "GRADE",
        title: "Nouvelle note en Mathématiques", body: "Une note a été saisie pour le 1er trimestre.",
        createdAt: new Date("2025-12-05T16:00:00Z"), readAt: new Date("2025-12-06T08:00:00Z"),
      },
    ],
  });
  console.log("Notifications : 4 (3 non lues)");

  // -------------------------------------------------------------------------
  // Finance — factures mensuelles oct→mars + inscription pour les 8 élèves,
  // paiements selon 4 profils de payeurs (delete-recreate sur FAC-DEMO-*).
  // Alimente /stats/finance : encaissé vs facturé par mois, taux de
  // recouvrement, impayés par classe.
  // -------------------------------------------------------------------------
  await prisma.invoice.deleteMany({ where: { reference: { startsWith: "FAC-DEMO" } } });
  const TUITION = 25000;
  const REGISTRATION = 50000;
  const METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER"] as const;
  const billingMonths = [
    { month: 10, year: 2025 }, { month: 11, year: 2025 }, { month: 12, year: 2025 },
    { month: 1, year: 2026 }, { month: 2, year: 2026 }, { month: 3, year: 2026 },
  ];
  const mm = (m: number) => String(m).padStart(2, "0");
  // Profils (i % 4) : 0 = ponctuel, 1 = payeur en retard (+ dernier mois impayé),
  // 2 = paiements partiels, 3 = mauvais payeur (2 premiers mois seulement)
  let invoiceCount = 0;
  let paymentCount = 0;
  for (let i = 0; i < studentDefs.length; i++) {
    const s = studentDefs[i];
    const profile = i % 4;
    // Facture d'inscription (septembre) — impayée pour les mauvais payeurs
    const regPaid = profile !== 3;
    await prisma.invoice.create({
      data: {
        reference: `FAC-DEMO-S${i + 1}-INS`,
        status: regPaid ? "PAID" : "OVERDUE",
        issueDate: new Date("2025-09-05T08:00:00Z"),
        dueDate: new Date("2025-09-15T00:00:00Z"),
        total: REGISTRATION,
        studentId: s.id, schoolYearId: year.id, createdById: admin.id,
        lines: { create: [{ label: "Inscription", quantity: 1, unitAmount: REGISTRATION }] },
        ...(regPaid && {
          payments: {
            create: [{
              amount: REGISTRATION, method: METHODS[i % 3],
              paidAt: new Date("2025-09-10T10:00:00Z"), receivedById: admin.id,
            }],
          },
        }),
      },
    });
    invoiceCount++;
    if (regPaid) paymentCount++;
    // Scolarité mensuelle
    for (let k = 0; k < billingMonths.length; k++) {
      const { month, year: y } = billingMonths[k];
      const isLast = k === billingMonths.length - 1;
      let payment: { amount: number; paidAt: Date } | null = null;
      if (profile === 0) {
        // ponctuel : payé dans le mois
        payment = { amount: TUITION, paidAt: new Date(`${y}-${mm(month)}-08T10:00:00Z`) };
      } else if (profile === 1 && !isLast) {
        // retardataire : payé le mois suivant (dernier mois impayé)
        const next = month === 12 ? { month: 1, year: y + 1 } : { month: month + 1, year: y };
        payment = { amount: TUITION, paidAt: new Date(`${next.year}-${mm(next.month)}-05T10:00:00Z`) };
      } else if (profile === 2) {
        // partiel : 15 000 / 25 000 chaque mois
        payment = { amount: 15000, paidAt: new Date(`${y}-${mm(month)}-12T10:00:00Z`) };
      } else if (profile === 3 && k < 2) {
        // mauvais payeur : seulement octobre et novembre
        payment = { amount: TUITION, paidAt: new Date(`${y}-${mm(month)}-20T10:00:00Z`) };
      }
      const paid = payment?.amount ?? 0;
      const status =
        paid >= TUITION ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "OVERDUE";
      await prisma.invoice.create({
        data: {
          reference: `FAC-DEMO-S${i + 1}-${y}${mm(month)}`,
          status,
          issueDate: new Date(`${y}-${mm(month)}-01T08:00:00Z`),
          dueDate: new Date(`${y}-${mm(month)}-10T00:00:00Z`),
          month, total: TUITION,
          studentId: s.id, schoolYearId: year.id, createdById: admin.id,
          lines: {
            create: [{ label: `Scolarité mensuelle — ${mm(month)}/${y}`, quantity: 1, unitAmount: TUITION }],
          },
          ...(payment && {
            payments: {
              create: [{
                amount: payment.amount, method: METHODS[(i + k) % 3],
                paidAt: payment.paidAt, receivedById: admin.id,
              }],
            },
          }),
        },
      });
      invoiceCount++;
      if (payment) paymentCount++;
    }
  }
  console.log(`Finance : ${invoiceCount} factures + ${paymentCount} paiements (4 profils de payeurs)`);

  // -------------------------------------------------------------------------
  // RH — salaires PAYÉS oct→mars + avril EN ATTENTE (stats finance : courbe
  // salaires + résultat mensuel). Employés existants de l'école (seed de base).
  // -------------------------------------------------------------------------
  const employees = await prisma.employee.findMany({
    where: { schoolId: SCHOOL_ID, active: true },
  });
  let salaryCount = 0;
  for (const emp of employees) {
    for (const { month, year: y } of billingMonths) {
      const bonuses = month === 12 ? 10000 : 0; // prime de fin d'année
      const deductions = 0;
      await prisma.salaryPayment.upsert({
        where: { employeeId_month_year: { employeeId: emp.id, month, year: y } },
        update: {
          baseAmount: emp.baseSalary, bonuses, deductions,
          netAmount: emp.baseSalary + bonuses - deductions,
          status: "PAID", paidAt: new Date(`${y}-${mm(month)}-28T10:00:00Z`),
        },
        create: {
          month, year: y,
          baseAmount: emp.baseSalary, bonuses, deductions,
          netAmount: emp.baseSalary + bonuses - deductions,
          status: "PAID", paidAt: new Date(`${y}-${mm(month)}-28T10:00:00Z`),
          method: "CASH", employeeId: emp.id, schoolYearId: year.id,
        },
      });
      salaryCount++;
    }
    // Avril : généré mais pas encore payé (exclu des stats — esprit trésorerie)
    await prisma.salaryPayment.upsert({
      where: { employeeId_month_year: { employeeId: emp.id, month: 4, year: 2026 } },
      update: { status: "PENDING", paidAt: null },
      create: {
        month: 4, year: 2026,
        baseAmount: emp.baseSalary, bonuses: 0, deductions: 0,
        netAmount: emp.baseSalary,
        status: "PENDING", method: "CASH", employeeId: emp.id, schoolYearId: year.id,
      },
    });
  }
  console.log(`Paie : ${salaryCount} salaires PAYÉS + ${employees.length} en attente (avril)`);

  // -------------------------------------------------------------------------
  // Dépenses mensuelles sept→juin (id fixes demo-exp-*) — camembert par
  // catégorie + courbe dépenses de /stats/finance
  // -------------------------------------------------------------------------
  const cats = await prisma.expenseCategory.findMany({ where: { schoolId: SCHOOL_ID } });
  const cat = (name: string) => {
    const c = cats.find((c) => c.name === name);
    if (!c) throw new Error(`Catégorie introuvable : ${name}`);
    return c.id;
  };
  const expenseMonths = [
    "2025-09", "2025-10", "2025-11", "2025-12", "2026-01",
    "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  ];
  let expenseCount = 0;
  for (let k = 0; k < expenseMonths.length; k++) {
    const ym = expenseMonths[k];
    const defs: { key: string; label: string; amount: number; categoryId: number; day: string }[] = [
      { key: `demo-exp-loyer-${ym}`, label: `Loyer ${ym}`, amount: 100000, categoryId: cat("Loyer"), day: "02" },
      {
        key: `demo-exp-elec-${ym}`, label: `Électricité & eau ${ym}`,
        amount: 25000 + ((k * 7) % 5) * 4000, // 25k–41k selon le mois
        categoryId: cat("Électricité & eau"), day: "15",
      },
    ];
    // Fournitures : achats trimestriels (sept, janv, avril)
    if (["2025-09", "2026-01", "2026-04"].includes(ym)) {
      defs.push({
        key: `demo-exp-fourn-${ym}`, label: `Fournitures scolaires ${ym}`,
        amount: 60000, categoryId: cat("Fournitures"), day: "08",
      });
    }
    // Divers : ponctuel (déc : décorations fête, mars : réparations)
    if (ym === "2025-12") {
      defs.push({
        key: `demo-exp-divers-${ym}`, label: "Fête de fin d'année (décorations, collation)",
        amount: 45000, categoryId: cat("Divers"), day: "18",
      });
    }
    if (ym === "2026-03") {
      defs.push({
        key: `demo-exp-divers-${ym}`, label: "Réparation portail + peinture",
        amount: 35000, categoryId: cat("Divers"), day: "22",
      });
    }
    for (const d of defs) {
      await prisma.expense.upsert({
        where: { id: d.key },
        update: { amount: d.amount, label: d.label },
        create: {
          id: d.key, label: d.label, amount: d.amount,
          date: new Date(`${ym}-${d.day}T09:00:00Z`),
          method: "CASH", categoryId: d.categoryId,
          schoolYearId: year.id, createdById: admin.id,
        },
      });
      expenseCount++;
    }
  }
  console.log(`Dépenses : ${expenseCount} réparties sur 10 mois et 4 catégories`);

  // -------------------------------------------------------------------------
  // Événements & annonces (find-or-create par titre)
  // -------------------------------------------------------------------------
  const eventDefs = [
    {
      title: "Réunion parents-professeurs", description: "Bilan du 3e trimestre et préparation de la rentrée.",
      startTime: "2026-07-24T17:00:00Z", endTime: "2026-07-24T19:00:00Z", classId: null as number | null,
    },
    {
      title: "Fête de fin d'année", description: "Spectacle des élèves et remise des bulletins.",
      startTime: "2026-06-26T09:00:00Z", endTime: "2026-06-26T13:00:00Z", classId: null as number | null,
    },
    {
      title: `Sortie pédagogique — ${classe1.name}`, description: "Visite du Musée national de Bamako.",
      startTime: "2026-03-20T08:00:00Z", endTime: "2026-03-20T12:00:00Z", classId: classe1.id,
    },
  ];
  for (const e of eventDefs) {
    const exists = await prisma.event.findFirst({ where: { schoolId: SCHOOL_ID, title: e.title } });
    if (!exists) {
      await prisma.event.create({
        data: {
          title: e.title, description: e.description,
          startTime: new Date(e.startTime), endTime: new Date(e.endTime),
          classId: e.classId, schoolId: SCHOOL_ID,
        },
      });
    }
  }
  const announcementDefs = [
    {
      title: "Inscriptions 2026-2027 ouvertes",
      description: "Les réinscriptions pour la prochaine année scolaire sont ouvertes jusqu'au 31 août.",
      date: "2026-07-15T08:00:00Z", classId: null as number | null,
    },
    {
      title: `Rappel matériel — ${classe1.name}`,
      description: "Merci d'apporter le compas et l'équerre pour le cours de géométrie de lundi.",
      date: "2026-03-13T12:00:00Z", classId: classe1.id,
    },
  ];
  for (const a of announcementDefs) {
    const exists = await prisma.announcement.findFirst({ where: { schoolId: SCHOOL_ID, title: a.title } });
    if (!exists) {
      await prisma.announcement.create({
        data: {
          title: a.title, description: a.description, date: new Date(a.date),
          classId: a.classId, schoolId: SCHOOL_ID,
        },
      });
    }
  }
  console.log("Agenda : 3 événements + 2 annonces");

  console.log("\n=== Seed de démonstration terminé ===");
  console.log("Stats prêtes : /stats/students (moyennes 3 trimestres, top/flop, présence),");
  console.log("/stats/teachers (notes par enseignant), /stats/finance (encaissé/facturé/dépenses/salaires)");
  console.log("Mot de passe de TOUS les comptes de démo : password123");
  console.log("- Enseignants : awa.diarra@demo.school, ibrahim.kone@demo.school");
  console.log("- Parents     : modibo.sangare@demo.school, salimata.toure@demo.school, drissa.keita@demo.school");
  console.log("- Élèves      : aminata.sangare@demo.school, sekou.sangare@demo.school, … (prenom.nom@demo.school)");
}

seedDemo()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
