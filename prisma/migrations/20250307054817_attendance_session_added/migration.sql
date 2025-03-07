-- CreateEnum
CREATE TYPE "Session" AS ENUM ('MORNING', 'EVENING');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "session" "Session" NOT NULL DEFAULT 'MORNING';
