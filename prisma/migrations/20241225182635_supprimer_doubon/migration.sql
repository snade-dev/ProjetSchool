/*
  Warnings:

  - A unique constraint covering the columns `[examId,studentId]` on the table `ExamAverage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[examId,studentId,subjectId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExamAverage_examId_studentId_key" ON "ExamAverage"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_examId_studentId_subjectId_key" ON "Result"("examId", "studentId", "subjectId");
