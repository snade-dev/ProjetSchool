-- W04 — l'unicité du nom d'une période d'évaluation passe de (école) à
-- (école, année scolaire) : l'assistant de passage d'année reconduit les
-- périodes avec le MÊME nom (« Trimestre 1 ») sur la nouvelle année.
-- SQL généré par `prisma migrate diff --from-migrations` (shadow DB temporaire).

-- DropIndex
DROP INDEX "Semester_schoolId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Semester_schoolId_schoolYearId_name_key" ON "Semester"("schoolId", "schoolYearId", "name");
