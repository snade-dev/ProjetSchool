// W03 — Student.classId n'existe plus dans le modèle : la classe d'une ligne
// de résultat est résolue côté serveur via l'Enrollment de l'année de la
// période, puis « aplatie » dans ce type partagé par les composants client.
export type ResultStudentInfo = {
  id: string;
  name: string;
  username: string;
  surname: string;
  /** Classe de l'élève sur l'année de la période (null si non inscrit). */
  classId: number | null;
  class: { name: string };
};

export type ResultRow = {
  id: number;
  score: number;
  classScore: number | null;
  examId: number | null;
  semesterId: number;
  studentId: string;
  subjectId: number;
  exam: { id: number; title: string } | null;
  semester: { id: number; name: string };
  subject: { id: number; name: string };
  student: ResultStudentInfo;
};
