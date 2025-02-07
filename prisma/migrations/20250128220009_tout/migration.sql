/*
  Warnings:

  - You are about to drop the column `semester` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `class` on the `Exam` table. All the data in the column will be lost.
  - Added the required column `semesterId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Made the column `examId` on table `Result` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_supervisorId_fkey";

-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_examId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "semester",
ADD COLUMN     "semesterId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "class",
ADD COLUMN     "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "classId" INTEGER NOT NULL,
ADD COLUMN     "semesterId" INTEGER NOT NULL,
ALTER COLUMN "examId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Semester" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Semester_name_key" ON "Semester"("name");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
