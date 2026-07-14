-- W05 (2/2) — suppression de Student.parentId : les tuteurs d'un élève sont
-- désormais portés par StudentGuardian (backfillé par 20260714170000_w05_student_guardian).
-- Migration DESTRUCTIVE : prévoir un backup avant rejeu en prod (cf. plan v4).

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_parentId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "parentId";
