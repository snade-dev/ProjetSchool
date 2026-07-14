-- W11 — Fin de TuitionPayment + échéanciers configurables (§2.4.2).
--
-- (1) CONVERSION EMBARQUÉE : chaque TuitionPayment encore présent devient une
--     Invoice PAID (1 ligne « Scolarité M/YYYY ») + un Payment CASH, avec la
--     generationKey `legacy-{id}` — même convention que l'ancien script Node
--     scripts/migrate-tuition.ts (supprimé par cette story). Les lignes déjà
--     migrées par le script sont ignorées (NOT EXISTS sur la generationKey).
--     Le rejeu PROD exécute donc la conversion automatiquement avant le DROP.
--     Ids déterministes via md5(...)::uuid (pas de gen_random_uuid : PG12 dev).
-- (2) DROP TABLE TuitionPayment — migration DESTRUCTIVE : backup avant rejeu
--     en prod (cf. plan v4, points de vigilance).
-- (3) CREATE TABLE FeeInstallment — échéancier détaillé d'une FeeStructure.

-- (1a) Invoice PAID pour chaque TuitionPayment non encore migré.
--      Année scolaire de rattachement : l'année ACTIVE de l'école de l'élève,
--      sinon la première année de cette école, sinon la première année en base
--      (même hypothèse H31 que le script Node).
INSERT INTO "Invoice"
  ("id", "reference", "status", "issueDate", "dueDate", "month",
   "generationKey", "total", "studentId", "schoolYearId", "createdById", "createdAt")
SELECT
  md5('w11-invoice-' || t."id")::uuid::text,
  'FAC-' || t."year" || '-L' || UPPER(LEFT(t."id", 8)),
  'PAID',
  t."paymentDate",
  t."paymentDate",
  t."month",
  'legacy-' || t."id",
  ROUND(t."amount")::int,
  t."studentId",
  COALESCE(
    (SELECT sy."id" FROM "SchoolYear" sy
      WHERE sy."schoolId" = s."schoolId" AND sy."isActive" = true
      ORDER BY sy."id" LIMIT 1),
    (SELECT sy."id" FROM "SchoolYear" sy
      WHERE sy."schoolId" = s."schoolId"
      ORDER BY sy."id" LIMIT 1),
    (SELECT sy."id" FROM "SchoolYear" sy ORDER BY sy."id" LIMIT 1)
  ),
  'migration',
  now()
FROM "TuitionPayment" t
JOIN "Student" s ON s."id" = t."studentId"
WHERE NOT EXISTS (
  SELECT 1 FROM "Invoice" i WHERE i."generationKey" = 'legacy-' || t."id"
);

-- (1b) Ligne unique « Scolarité M/YYYY » des factures créées en (1a).
INSERT INTO "InvoiceLine" ("label", "quantity", "unitAmount", "invoiceId")
SELECT
  'Scolarité ' || t."month" || '/' || t."year",
  1,
  ROUND(t."amount")::int,
  i."id"
FROM "TuitionPayment" t
JOIN "Invoice" i ON i."generationKey" = 'legacy-' || t."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = i."id"
);

-- (1c) Paiement CASH soldant chaque facture créée en (1a).
INSERT INTO "Payment"
  ("id", "amount", "method", "paidAt", "invoiceId", "receivedById", "createdAt")
SELECT
  md5('w11-payment-' || t."id")::uuid::text,
  ROUND(t."amount")::int,
  'CASH',
  t."paymentDate",
  i."id",
  'migration',
  now()
FROM "TuitionPayment" t
JOIN "Invoice" i ON i."generationKey" = 'legacy-' || t."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "Payment" p WHERE p."invoiceId" = i."id"
);

-- (2) Fin de l'ancien système.

-- DropForeignKey
ALTER TABLE "TuitionPayment" DROP CONSTRAINT "TuitionPayment_studentId_fkey";

-- DropTable
DROP TABLE "TuitionPayment";

-- (3) Échéanciers configurables (§2.4.2).

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" SERIAL NOT NULL,
    "feeStructureId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeInstallment_feeStructureId_month_key" ON "FeeInstallment"("feeStructureId", "month");

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
