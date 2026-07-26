-- CreateTable
CREATE TABLE "EventContribution" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "EventContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventContributionPayment" (
    "id" TEXT NOT NULL,
    "contributionId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "receivedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventContributionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventContribution_eventId_key" ON "EventContribution"("eventId");

-- CreateIndex
CREATE INDEX "EventContribution_schoolId_idx" ON "EventContribution"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "EventContributionPayment_reference_key" ON "EventContributionPayment"("reference");

-- CreateIndex
CREATE INDEX "EventContributionPayment_contributionId_studentId_idx" ON "EventContributionPayment"("contributionId", "studentId");

-- CreateIndex
CREATE INDEX "EventContributionPayment_studentId_idx" ON "EventContributionPayment"("studentId");

-- AddForeignKey
ALTER TABLE "EventContribution" ADD CONSTRAINT "EventContribution_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventContribution" ADD CONSTRAINT "EventContribution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventContributionPayment" ADD CONSTRAINT "EventContributionPayment_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "EventContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventContributionPayment" ADD CONSTRAINT "EventContributionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
