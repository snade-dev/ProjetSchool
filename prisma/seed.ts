import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


async function seed() {
    // SUBJECT
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
    await prisma.subject.create({ data: subject });
  }
}

seed()