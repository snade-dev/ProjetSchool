import type { Semester } from "@/app/generated/prisma";

// W03 — Student.classId n'existe plus : la classe est résolue côté serveur via
// l'Enrollment de l'année de la période du rattrapage, puis aplatie ici.
export type MakeupStudentInfo = {
  id: string;
  name: string;
  classId: number | null;
  class: { name: string };
};

export type MakeupExamRow = {
  id: string;
  studentId: string;
  sessionId: string;
  subjectId: number;
  enrollmentDate: Date;
  score: number | null;
  gradedById: string | null;
  gradedAt: Date | null;
  resultId: number | null;
  student: MakeupStudentInfo;
  subject: { id: number; name: string };
};

export type MakeupExamSessionRow = Omit<MakeupExamRow, "subject"> & {
  session: { semester: Semester };
};
