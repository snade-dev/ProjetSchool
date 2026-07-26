/*
  Warnings:

  - Added the required column `schoolYearId` to the `EventContribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventContribution" ADD COLUMN     "schoolYearId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "EventContribution" ADD CONSTRAINT "EventContribution_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
