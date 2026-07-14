-- W03 (2/2) — suppression de Student.classId : la classe d'un élève est
-- désormais portée par son Enrollment (backfillé par 20260714150000_w03_enrollment).
-- Migration DESTRUCTIVE : prévoir un backup avant rejeu en prod (cf. plan v4).

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "classId";
