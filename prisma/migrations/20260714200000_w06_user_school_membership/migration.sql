-- W06 — Compte multi-établissements (§2.2.8, §2.7.10) : table de rattachement
-- UserSchoolMembership (vérité des rattachements) + backfill depuis le contexte
-- actif existant (User.schoolId + User.role). User.schoolId/User.role ne sont
-- PAS supprimés : ils restent le contexte actif de la session, alimenté par le
-- sélecteur d'espace. Le superadmin (rôle global, schoolId null) n'a aucune
-- membership.

-- CreateTable
CREATE TABLE "UserSchoolMembership" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSchoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSchoolMembership_schoolId_idx" ON "UserSchoolMembership"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSchoolMembership_userId_schoolId_role_key" ON "UserSchoolMembership"("userId", "schoolId", "role");

-- AddForeignKey
ALTER TABLE "UserSchoolMembership" ADD CONSTRAINT "UserSchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSchoolMembership" ADD CONSTRAINT "UserSchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : une membership active par User déjà rattaché à une école avec un
-- rôle non vide (le superadmin est exclu : rôle global, pas de membership).
INSERT INTO "UserSchoolMembership" ("userId", "schoolId", "role", "active")
SELECT u."id", u."schoolId", u."role", true
FROM "user" u
WHERE u."schoolId" IS NOT NULL
  AND u."role" IS NOT NULL
  AND u."role" <> ''
  AND u."role" <> 'superadmin';
