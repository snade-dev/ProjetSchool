/*
  Warnings:

  - You are about to drop the column `semesterId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Lesson` table. All the data in the column will be lost.
  - Added the required column `semesterId` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_semesterId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "semesterId";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "semester",
ADD COLUMN     "semesterId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "semester";

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
