-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('En attente', 'En traitement', 'Terminé', 'Rejeté');

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "decription" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'En attente',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedDate" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attestation_studentId_idx" ON "Attestation"("studentId");

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
