-- CreateEnum
CREATE TYPE "EvaluationSystem" AS ENUM ('TRIMESTER', 'MONTHLY');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "evaluationSystem" "EvaluationSystem" NOT NULL DEFAULT 'TRIMESTER';

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "label" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "system" "EvaluationSystem" NOT NULL DEFAULT 'TRIMESTER';

-- Backfill V01 : les périodes existantes (semestre1..3) deviennent des trimestres ordonnés
UPDATE "Semester" SET
  "order" = COALESCE(NULLIF(regexp_replace("name", '\D', '', 'g'), '')::int, 1),
  "label" = CASE COALESCE(NULLIF(regexp_replace("name", '\D', '', 'g'), '')::int, 1)
    WHEN 1 THEN '1er trimestre'
    WHEN 2 THEN '2e trimestre'
    WHEN 3 THEN '3e trimestre'
    ELSE "name"
  END;
