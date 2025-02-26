/*
  Warnings:

  - You are about to drop the column `subjectId` on the `MakeupSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[semesterId,startTime]` on the table `MakeupSession` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MakeupSession" DROP CONSTRAINT "MakeupSession_subjectId_fkey";

-- DropIndex
DROP INDEX "MakeupSession_semesterId_subjectId_startTime_key";

-- AlterTable
ALTER TABLE "MakeupSession" DROP COLUMN "subjectId";

-- CreateIndex
CREATE UNIQUE INDEX "MakeupSession_semesterId_startTime_key" ON "MakeupSession"("semesterId", "startTime");
