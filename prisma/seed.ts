import { PrismaClient } from "../src/app/generated/prisma";

const prisma = new PrismaClient();

async function seed() {
  // SUBJECT (idempotent : upsert sur le nom unique)
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
      where: { name: subject.name },
      update: {},
      create: subject,
    });
  }

  // SCHOOL SETTINGS (singleton id = 1)
  await prisma.schoolSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Mon Établissement",
      currency: "FCFA",
    },
  });

  // SCHOOL YEAR active (upsert sur le nom unique)
  await prisma.schoolYear.upsert({
    where: { name: "2025-2026" },
    update: { isActive: true },
    create: {
      name: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  // Vérifie l'invariant "une seule année active" via le helper
  const active = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!active) {
    throw new Error("Aucune année scolaire active — configurez /settings");
  }
  console.log(`Année scolaire active : ${active.name}`);
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
