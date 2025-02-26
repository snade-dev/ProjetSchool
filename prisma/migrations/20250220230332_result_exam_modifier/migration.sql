/*
  Warnings:

  - A unique constraint covering the columns `[resultId]` on the table `MakeupExam` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MakeupExam" ADD COLUMN     "resultId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MakeupExam_resultId_key" ON "MakeupExam"("resultId");

-- AddForeignKey
ALTER TABLE "MakeupExam" ADD CONSTRAINT "MakeupExam_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;
