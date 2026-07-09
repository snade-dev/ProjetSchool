-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "remindedAt" TIMESTAMP(3),
ADD COLUMN     "reminderNote" TEXT;
