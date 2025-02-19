-- CreateTable
CREATE TABLE "ResultAverage" (
    "id" SERIAL NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ResultAverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultAverage_semesterId_studentId_key" ON "ResultAverage"("semesterId", "studentId");

-- AddForeignKey
ALTER TABLE "ResultAverage" ADD CONSTRAINT "ResultAverage_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultAverage" ADD CONSTRAINT "ResultAverage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
