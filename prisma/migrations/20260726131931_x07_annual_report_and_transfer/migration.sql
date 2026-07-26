-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "annualDecision" TEXT,
ADD COLUMN     "annualObservation" TEXT,
ADD COLUMN     "conduct" TEXT,
ADD COLUMN     "lateCount" INTEGER,
ADD COLUMN     "workAppreciation" TEXT;

-- AlterTable
ALTER TABLE "SchoolSettings" ADD COLUMN     "academy" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "countryLine1" TEXT,
ADD COLUMN     "countryLine2" TEXT,
ADD COLUMN     "directorName" TEXT,
ADD COLUMN     "directorTitle" TEXT,
ADD COLUMN     "ministry" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "birthPlace" TEXT;

-- CreateTable
CREATE TABLE "TransferCertificate" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" INTEGER NOT NULL,
    "className" TEXT NOT NULL,
    "attendedFrom" TIMESTAMP(3) NOT NULL,
    "attendedTo" TIMESTAMP(3) NOT NULL,
    "yearsAttended" INTEGER NOT NULL,
    "annualAverage" DOUBLE PRECISION,
    "annualRank" INTEGER,
    "classSize" INTEGER,
    "conduct" TEXT,
    "workAppreciation" TEXT,
    "decision" TEXT,
    "reason" TEXT NOT NULL,
    "attestationId" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "TransferCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferCertificate_reference_key" ON "TransferCertificate"("reference");

-- CreateIndex
CREATE INDEX "TransferCertificate_studentId_idx" ON "TransferCertificate"("studentId");

-- CreateIndex
CREATE INDEX "TransferCertificate_schoolId_issuedAt_idx" ON "TransferCertificate"("schoolId", "issuedAt");

-- AddForeignKey
ALTER TABLE "TransferCertificate" ADD CONSTRAINT "TransferCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferCertificate" ADD CONSTRAINT "TransferCertificate_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferCertificate" ADD CONSTRAINT "TransferCertificate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
