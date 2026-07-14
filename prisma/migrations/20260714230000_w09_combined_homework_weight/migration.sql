-- W09 — Régime combiné (§2.3.1 système 3) + pondération devoirs/composition.
-- 1) EvaluationSystem gagne COMBINED : une classe combinée voit à la fois les
--    périodes TRIMESTER et MONTHLY de son année (le régime de CALCUL d'un
--    bulletin est décidé par Semester.system, pas par la classe).
-- 2) Class.homeworkWeight (en %) : poids de la note de devoirs (classScore)
--    face à la composition (score) dans la moyenne matière des périodes
--    TRIMESTER. Défaut 50 = moyenne simple historique (comportement inchangé).

-- AlterEnum
ALTER TYPE "EvaluationSystem" ADD VALUE 'COMBINED';

-- AlterTable
ALTER TABLE "Class" ADD COLUMN "homeworkWeight" INTEGER NOT NULL DEFAULT 50;
