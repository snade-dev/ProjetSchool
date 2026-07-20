-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SchoolSettings" ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpFrom" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPass" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpUser" TEXT;
