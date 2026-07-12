-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "FeeStructure" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
CREATE SEQUENCE schoolsettings_id_seq;
ALTER TABLE "SchoolSettings" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "id" SET DEFAULT nextval('schoolsettings_id_seq');
ALTER SEQUENCE schoolsettings_id_seq OWNED BY "SchoolSettings"."id";

-- AlterTable
ALTER TABLE "SchoolYear" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "schoolId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "schoolId" INTEGER;

-- Backfill V02 : slug de l'école existante, comptes rattachés à l'école #1,
-- séquence alignée sur les ids existants
UPDATE "SchoolSettings" SET "slug" = trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || "id" WHERE "slug" IS NULL;
ALTER TABLE "SchoolSettings" ALTER COLUMN "slug" SET NOT NULL;
UPDATE "user" SET "schoolId" = 1;
SELECT setval('schoolsettings_id_seq', (SELECT COALESCE(MAX("id"), 1) FROM "SchoolSettings"));

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSettings_slug_key" ON "SchoolSettings"("slug");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolYear" ADD CONSTRAINT "SchoolYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

