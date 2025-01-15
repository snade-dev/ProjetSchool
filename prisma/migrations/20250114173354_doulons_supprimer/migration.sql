/*
  Warnings:

  - A unique constraint covering the columns `[studentId,quizId,questionId]` on the table `StudentAnswer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "StudentAnswer_studentId_idx" ON "StudentAnswer"("studentId");

-- CreateIndex
CREATE INDEX "StudentAnswer_quizId_idx" ON "StudentAnswer"("quizId");

-- CreateIndex
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_studentId_quizId_questionId_key" ON "StudentAnswer"("studentId", "quizId", "questionId");
