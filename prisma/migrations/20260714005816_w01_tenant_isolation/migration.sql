-- DropIndex
DROP INDEX "Class_name_key";

-- DropIndex
DROP INDEX "ExpenseCategory_name_key";

-- DropIndex
DROP INDEX "Quiz_title_key";

-- DropIndex
DROP INDEX "SchoolYear_name_key";

-- DropIndex
DROP INDEX "Semester_name_key";

-- DropIndex
DROP INDEX "Subject_name_key";

-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Class" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExpenseCategory" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FeeStructure" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Parent" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SchoolYear" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Semester" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "schoolId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "schoolId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_schoolId_name_key" ON "ExpenseCategory"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_schoolId_title_key" ON "Quiz"("schoolId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_schoolId_name_key" ON "SchoolYear"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_schoolId_name_key" ON "Semester"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

