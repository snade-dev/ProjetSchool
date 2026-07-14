-- W02 — niveaux (Level) + rattachement des classes et des périodes d'évaluation
-- à l'année scolaire. SQL généré par `prisma migrate diff` puis réordonné à la
-- main : les colonnes `schoolYearId` sont ajoutées NULLABLE, backfillées
-- (année active de l'école, sinon la plus récente, sinon une année créée par
-- défaut), puis passées NOT NULL.

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "cycle" TEXT,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Level_schoolId_name_key" ON "Level"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — schoolYearId d'abord NULLABLE (backfill avant SET NOT NULL)
ALTER TABLE "Class" ADD COLUMN     "levelId" INTEGER,
ADD COLUMN     "schoolYearId" INTEGER;

-- AlterTable — idem pour les périodes
ALTER TABLE "Semester" ADD COLUMN     "schoolYearId" INTEGER;

-- Backfill 0 : les écoles qui ont des classes ou des périodes mais AUCUNE année
-- scolaire reçoivent une année par défaut, marquée active.
INSERT INTO "SchoolYear" ("name", "startDate", "endDate", "isActive", "schoolId")
SELECT '2025-2026', TIMESTAMP '2025-09-01', TIMESTAMP '2026-06-30', true, s."id"
FROM "SchoolSettings" s
WHERE NOT EXISTS (SELECT 1 FROM "SchoolYear" y WHERE y."schoolId" = s."id")
  AND (
    EXISTS (SELECT 1 FROM "Class" c WHERE c."schoolId" = s."id")
    OR EXISTS (SELECT 1 FROM "Semester" se WHERE se."schoolId" = s."id")
  );

-- Backfill 1 : chaque classe est rattachée à l'année ACTIVE de son école ;
-- à défaut, à la plus récente (startDate puis id décroissants).
UPDATE "Class" c
SET "schoolYearId" = (
    SELECT y."id" FROM "SchoolYear" y
    WHERE y."schoolId" = c."schoolId"
    ORDER BY y."isActive" DESC, y."startDate" DESC, y."id" DESC
    LIMIT 1
)
WHERE c."schoolYearId" IS NULL;

-- Backfill 2 : même logique pour les périodes d'évaluation.
UPDATE "Semester" s
SET "schoolYearId" = (
    SELECT y."id" FROM "SchoolYear" y
    WHERE y."schoolId" = s."schoolId"
    ORDER BY y."isActive" DESC, y."startDate" DESC, y."id" DESC
    LIMIT 1
)
WHERE s."schoolYearId" IS NULL;

-- Après backfill, la colonne devient obligatoire.
ALTER TABLE "Class" ALTER COLUMN "schoolYearId" SET NOT NULL;
ALTER TABLE "Semester" ALTER COLUMN "schoolYearId" SET NOT NULL;

-- DropIndex — l'unicité du nom de classe passe de (école) à (école, année)
DROP INDEX "Class_schoolId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_schoolYearId_name_key" ON "Class"("schoolId", "schoolYearId", "name");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
