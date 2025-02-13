-- CreateTable
CREATE TABLE "_SemesterToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SemesterToSubject_AB_unique" ON "_SemesterToSubject"("A", "B");

-- CreateIndex
CREATE INDEX "_SemesterToSubject_B_index" ON "_SemesterToSubject"("B");

-- AddForeignKey
ALTER TABLE "_SemesterToSubject" ADD CONSTRAINT "_SemesterToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SemesterToSubject" ADD CONSTRAINT "_SemesterToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
