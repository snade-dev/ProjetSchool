-- W15 — Observations & discipline (§2.3.7) + justifications d'absence (§2.3.6)

-- AlterTable : « absent justifié » (posé par l'acceptation d'une justification)
ALTER TABLE "Attendance" ADD COLUMN "justified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Observation" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sharedWithParents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceJustification" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "parentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fileUrl" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'En attente',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "AbsenceJustification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Observation_studentId_createdAt_idx" ON "Observation"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "Observation_schoolId_createdAt_idx" ON "Observation"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceJustification_attendanceId_key" ON "AbsenceJustification"("attendanceId");

-- CreateIndex
CREATE INDEX "AbsenceJustification_schoolId_status_idx" ON "AbsenceJustification"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AbsenceJustification_parentId_idx" ON "AbsenceJustification"("parentId");

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceJustification" ADD CONSTRAINT "AbsenceJustification_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceJustification" ADD CONSTRAINT "AbsenceJustification_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceJustification" ADD CONSTRAINT "AbsenceJustification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
