/*
  Warnings:

  - Added the required column `title` to the `Attestation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attestation" ADD COLUMN     "title" TEXT NOT NULL;
