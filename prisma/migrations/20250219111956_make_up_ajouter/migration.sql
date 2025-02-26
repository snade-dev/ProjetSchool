-- CreateTable
CREATE TABLE "MakeupSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MakeupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MakeupExam" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "MakeupExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MakeupSession_semesterId_subjectId_startTime_key" ON "MakeupSession"("semesterId", "subjectId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "MakeupExam_studentId_sessionId_key" ON "MakeupExam"("studentId", "sessionId");

-- AddForeignKey
ALTER TABLE "MakeupSession" ADD CONSTRAINT "MakeupSession_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupSession" ADD CONSTRAINT "MakeupSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupSession" ADD CONSTRAINT "MakeupSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupExam" ADD CONSTRAINT "MakeupExam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupExam" ADD CONSTRAINT "MakeupExam_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MakeupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MakeupExam" ADD CONSTRAINT "MakeupExam_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
