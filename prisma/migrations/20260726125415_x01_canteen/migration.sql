-- CreateEnum
CREATE TYPE "CanteenSubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "MealAttendanceKind" AS ENUM ('SUBSCRIBED', 'EXTRA', 'ABSENT');

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "period" "FeePeriod" NOT NULL DEFAULT 'MONTHLY',
    "amount" INTEGER NOT NULL,
    "unitPrice" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "schoolYearId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanteenSubscription" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "mealPlanId" INTEGER NOT NULL,
    "schoolYearId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "CanteenSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "CanteenSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "MealAttendanceKind" NOT NULL,
    "mealPlanId" INTEGER,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "MealAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_schoolId_schoolYearId_name_key" ON "MealPlan"("schoolId", "schoolYearId", "name");

-- CreateIndex
CREATE INDEX "CanteenSubscription_mealPlanId_idx" ON "CanteenSubscription"("mealPlanId");

-- CreateIndex
CREATE INDEX "CanteenSubscription_schoolId_status_idx" ON "CanteenSubscription"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CanteenSubscription_studentId_schoolYearId_key" ON "CanteenSubscription"("studentId", "schoolYearId");

-- CreateIndex
CREATE INDEX "MealAttendance_schoolId_date_idx" ON "MealAttendance"("schoolId", "date");

-- CreateIndex
CREATE INDEX "MealAttendance_mealPlanId_idx" ON "MealAttendance"("mealPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "MealAttendance_studentId_date_key" ON "MealAttendance"("studentId", "date");

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanteenSubscription" ADD CONSTRAINT "CanteenSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanteenSubscription" ADD CONSTRAINT "CanteenSubscription_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanteenSubscription" ADD CONSTRAINT "CanteenSubscription_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanteenSubscription" ADD CONSTRAINT "CanteenSubscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealAttendance" ADD CONSTRAINT "MealAttendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
