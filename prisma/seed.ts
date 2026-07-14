import { PrismaClient } from "../src/app/generated/prisma";

const prisma = new PrismaClient();

// W01 — plus de @default(1) sur schoolId : le seed cible EXPLICITEMENT l'école #1.
const SEED_SCHOOL_ID = 1;

async function seed() {
  // SCHOOL SETTINGS (école #1 — créée AVANT toute donnée qui la référence)
  await prisma.school.upsert({
    where: { id: SEED_SCHOOL_ID },
    update: {},
    create: {
      id: SEED_SCHOOL_ID,
      name: "Mon Établissement",
      currency: "FCFA",
      slug: "mon-etablissement-1", // V02 — identifiant SaaS
    },
  });

  // SUBJECT (idempotent : upsert sur la clé composite école + nom, W01)
  const subjectData = [
    { name: "Mathématiques" },
    { name: "Sciences" },
    { name: "Anglais" },
    { name: "Histoire" },
    { name: "Géographie" },
    { name: "Physique" },
    { name: "Chimie" },
    { name: "Biologie" },
    { name: "Informatique" },
    { name: "Art" },
  ];

  for (const subject of subjectData) {
    await prisma.subject.upsert({
      where: {
        schoolId_name: { schoolId: SEED_SCHOOL_ID, name: subject.name },
      },
      update: {},
      create: { ...subject, schoolId: SEED_SCHOOL_ID },
    });
  }

  // SCHOOL YEAR active (upsert sur la clé composite école + nom, W01)
  await prisma.schoolYear.upsert({
    where: {
      schoolId_name: { schoolId: SEED_SCHOOL_ID, name: "2025-2026" },
    },
    update: { isActive: true },
    create: {
      name: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
      schoolId: SEED_SCHOOL_ID,
    },
  });

  // Vérifie l'invariant "une seule année active PAR ÉCOLE" via le helper
  const active = await prisma.schoolYear.findFirst({
    where: { isActive: true, schoolId: SEED_SCHOOL_ID },
  });
  if (!active) {
    throw new Error("Aucune année scolaire active — configurez /settings");
  }
  console.log(`Année scolaire active : ${active.name}`);

  // ==========================================================================
  // STORY 03 — Finance / RH (idempotent : upsert / skipDuplicates)
  // S'appuie sur les Class/Teacher EXISTANTS en base (findMany), pas d'ids codés.
  // ==========================================================================

  // ---- ExpenseCategory : 4 catégories (unicité école + nom, W01) ----
  const expenseCategories = [
    "Fournitures",
    "Électricité & eau",
    "Loyer",
    "Divers",
  ];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { schoolId_name: { schoolId: SEED_SCHOOL_ID, name } },
      update: {},
      create: { name, schoolId: SEED_SCHOOL_ID },
    });
  }
  console.log(`ExpenseCategory : ${expenseCategories.length} catégories (upsert)`);

  // ---- FeeStructure : 2 par Class existante, rattachées à l'année active ----
  const classes = await prisma.class.findMany({
    where: { schoolId: SEED_SCHOOL_ID },
  });
  for (const cls of classes) {
    const fees = [
      { label: "Scolarité mensuelle", amount: 25000, period: "MONTHLY" as const },
      { label: "Inscription", amount: 50000, period: "ONE_TIME" as const },
    ];
    for (const fee of fees) {
      await prisma.feeStructure.upsert({
        where: {
          classId_schoolYearId_label: {
            classId: cls.id,
            schoolYearId: active.id,
            label: fee.label,
          },
        },
        update: { amount: fee.amount, period: fee.period },
        create: {
          label: fee.label,
          amount: fee.amount,
          period: fee.period,
          classId: cls.id,
          schoolYearId: active.id,
          schoolId: SEED_SCHOOL_ID, // W01 — plus de défaut
        },
      });
    }
  }
  console.log(
    `FeeStructure : ${classes.length * 2} frais (2 × ${classes.length} classes, upsert)`
  );

  // ---- Employee : 2 liés aux 2 premiers Teachers existants + 1 staff ----
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: SEED_SCHOOL_ID },
    orderBy: { id: "asc" },
    take: 2,
  });
  for (const teacher of teachers) {
    await prisma.employee.upsert({
      where: { teacherId: teacher.id },
      update: {},
      create: {
        teacherId: teacher.id,
        name: teacher.name,
        surname: teacher.surname,
        position: "Enseignant",
        phone: teacher.phone ?? undefined,
        email: teacher.email ?? undefined,
        hireDate: new Date("2025-09-01"),
        baseSalary: 150000,
        schoolId: SEED_SCHOOL_ID, // W01 — plus de défaut
      },
    });
  }
  // Staff (pas de Teacher) : id fixe pour idempotence
  await prisma.employee.upsert({
    where: { id: "emp-staff-1" },
    update: {},
    create: {
      id: "emp-staff-1",
      name: "Aïcha",
      surname: "Traoré",
      position: "Secrétaire",
      hireDate: new Date("2025-09-01"),
      baseSalary: 80000,
      schoolId: SEED_SCHOOL_ID, // W01 — plus de défaut
    },
  });
  console.log(`Employee : ${teachers.length} enseignants + 1 staff (upsert)`);

  // ---- Expense : quelques dépenses de démonstration sur 3 mois ----
  // Idempotent via id fixe (upsert). Réparties sur 3 mois différents (stats S16).
  const suppliesCat = await prisma.expenseCategory.findUniqueOrThrow({
    where: { schoolId_name: { schoolId: SEED_SCHOOL_ID, name: "Fournitures" } },
  });
  const rentCat = await prisma.expenseCategory.findUniqueOrThrow({
    where: { schoolId_name: { schoolId: SEED_SCHOOL_ID, name: "Loyer" } },
  });
  const utilitiesCat = await prisma.expenseCategory.findUniqueOrThrow({
    where: {
      schoolId_name: { schoolId: SEED_SCHOOL_ID, name: "Électricité & eau" },
    },
  });
  const demoExpenses = [
    {
      id: "exp-demo-1",
      label: "Achat de fournitures scolaires",
      amount: 120000,
      date: new Date("2025-10-05"),
      categoryId: suppliesCat.id,
    },
    {
      id: "exp-demo-2",
      label: "Loyer novembre",
      amount: 300000,
      date: new Date("2025-11-01"),
      categoryId: rentCat.id,
    },
    {
      id: "exp-demo-3",
      label: "Facture électricité & eau décembre",
      amount: 85000,
      date: new Date("2025-12-10"),
      categoryId: utilitiesCat.id,
    },
  ];
  for (const exp of demoExpenses) {
    await prisma.expense.upsert({
      where: { id: exp.id },
      update: {},
      create: {
        id: exp.id,
        label: exp.label,
        amount: exp.amount,
        date: exp.date,
        method: "CASH",
        categoryId: exp.categoryId,
        schoolYearId: active.id,
        createdById: "seed",
      },
    });
  }
  console.log(`Expense : ${demoExpenses.length} dépenses de démonstration (upsert)`);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
