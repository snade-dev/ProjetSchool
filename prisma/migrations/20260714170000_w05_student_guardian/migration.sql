-- W05 (1/2) — StudentGuardian : tuteurs multiples avec droits différenciés (§2.2.3).
-- SQL généré par `prisma migrate diff` puis complété à la main : backfill d'une
-- ligne StudentGuardian par Student.parentId existant (relationship « tuteur »,
-- isLegal + canPay + canViewGrades + canPickup à true — le tuteur historique
-- garde tous les droits). La suppression de Student.parentId suit (2/2).

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isLegal" BOOLEAN NOT NULL DEFAULT true,
    "canPay" BOOLEAN NOT NULL DEFAULT true,
    "canViewGrades" BOOLEAN NOT NULL DEFAULT true,
    "canPickup" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentGuardian_parentId_idx" ON "StudentGuardian"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_studentId_parentId_key" ON "StudentGuardian"("studentId", "parentId");

-- Backfill : chaque Student.parentId devient un lien tuteur avec tous les
-- droits (comportement identique à l'ancien modèle 1-N). Exécuté AVANT les FK
-- par cohérence avec W03 (les données existantes les satisfont déjà :
-- parentId est une FK vivante vers Parent au moment du backfill).
INSERT INTO "StudentGuardian" ("studentId", "parentId", "relationship", "isLegal", "canPay", "canViewGrades", "canPickup")
SELECT s."id", s."parentId", 'tuteur', true, true, true, true
FROM "Student" s;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
