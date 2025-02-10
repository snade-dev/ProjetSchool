/*
  Warnings:

  - You are about to drop the column `answerId` on the `Complaint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_answerId_fkey";

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "answerId";
