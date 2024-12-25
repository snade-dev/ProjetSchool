/*
  Warnings:

  - You are about to drop the column `gradeId` on the `Student` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_gradeId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "gradeId";

-- AlterTable
ALTER TABLE "_SubjectToTeacher" ADD CONSTRAINT "_SubjectToTeacher_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SubjectToTeacher_AB_unique";
