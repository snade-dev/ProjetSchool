-- W08 — Coefficients par matière de classe (§2.1.6) + marqueur « bulletin périmé ».
-- SQL généré par `prisma migrate diff` puis complété à la main : backfill d'une
-- ligne ClassSubject (coefficient 1) pour chaque couple (classId, subjectId)
-- distinct présent dans Lesson — coefficient 1 partout = moyennes inchangées.
-- Une matière notée SANS ligne ClassSubject compte aussi pour 1 (fallback code).

-- AlterTable
ALTER TABLE "ResultAverage" ADD COLUMN     "stale" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSubject_subjectId_idx" ON "ClassSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : chaque couple (classe, matière) DISTINCT des Lessons existantes
-- devient une ligne ClassSubject à coefficient 1 (comportement inchangé — les
-- moyennes pondérées avec coefficient 1 partout = moyenne simple H17).
INSERT INTO "ClassSubject" ("classId", "subjectId", "coefficient")
SELECT DISTINCT l."classId", l."subjectId", 1
FROM "Lesson" l;
