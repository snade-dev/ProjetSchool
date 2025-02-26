/*
  Warnings:

  - A unique constraint covering the columns `[studentId,sessionId,subjectId]` on the table `MakeupExam` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subjectId` to the `MakeupExam` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MakeupExam_studentId_sessionId_key";

-- AlterTable
ALTER TABLE "MakeupExam" ADD COLUMN     "subjectId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MakeupExam_studentId_sessionId_subjectId_key" ON "MakeupExam"("studentId", "sessionId", "subjectId");

-- AddForeignKey
ALTER TABLE "MakeupExam" ADD CONSTRAINT "MakeupExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
