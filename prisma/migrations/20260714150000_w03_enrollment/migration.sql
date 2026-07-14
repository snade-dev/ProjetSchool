-- W03 — Enrollment : inscriptions par année scolaire (§2.1.3).
-- SQL généré par `prisma migrate diff` puis complété à la main : backfill
-- d'un Enrollment ACTIVE pour chaque Student existant (classe actuelle
-- Student.classId × année de cette classe Class.schoolYearId).

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'LEFT', 'GRADUATED', 'REPEATED');

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "schoolYearId" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_schoolYearId_key" ON "Enrollment"("studentId", "schoolYearId");

-- Backfill : une inscription ACTIVE par élève, sur sa classe actuelle et
-- l'année de cette classe (Class.schoolYearId, garanti NOT NULL depuis W02).
-- Exécuté AVANT les FK par cohérence avec W01/W02 (les données existantes
-- les satisfont déjà : classId et schoolYearId proviennent de lignes vivantes).
INSERT INTO "Enrollment" ("studentId", "classId", "schoolYearId", "status")
SELECT s."id", s."classId", c."schoolYearId", 'ACTIVE'
FROM "Student" s
JOIN "Class" c ON c."id" = s."classId";

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
