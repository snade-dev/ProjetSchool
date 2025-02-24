/*
  Warnings:

  - A unique constraint covering the columns `[semesterId,studentId,subjectId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Result_examId_studentId_subjectId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Result_semesterId_studentId_subjectId_key" ON "Result"("semesterId", "studentId", "subjectId");
