/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `StudentAnswer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentAnswer" DROP COLUMN "isCorrect",
ADD COLUMN     "quizResultId" TEXT,
ADD COLUMN     "score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizResult_studentId_quizId_key" ON "QuizResult"("studentId", "quizId");

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_quizResultId_fkey" FOREIGN KEY ("quizResultId") REFERENCES "QuizResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
