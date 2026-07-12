import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type FormContainerProps = {
  // le nom de la table envoyer en props
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "average"
    | "attendance"
    | "event"
    | "announcement"
    | "semester"
    | "quiz"
    | "makeupSession"
    | "attestation"
    | "schoolYear"
    | "fee"
    | "invoice"
    | "payment"
    | "expense"
    | "employee";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const currentUserID = session?.user.id;
  let relatedData = {};
  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      case "class":
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers };
        break;
      case "teacher":
        const teacherSubject = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubject };
        break;
      case "student":
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses };
        break;
      case "exam":
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserID! } : {}),
          },
          // V01 — le régime de la classe de la leçon filtre les périodes du formulaire
          select: {
            id: true,
            name: true,
            class: { select: { evaluationSystem: true } },
          },
        });
        const examSemester = await prisma.semester.findMany({
          select: { id: true, name: true, system: true },
          orderBy: [{ system: "asc" }, { order: "asc" }],
        });

        relatedData = { lessons: examLessons, semesters: examSemester };
        break;

      case "announcement":
        const announceClass = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        relatedData = { classes: announceClass };
        break;
      case "quiz":
        const quizClass = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        const quizSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });

        relatedData = { classes: quizClass, subjects: quizSubjects };
        break;
      case "makeupSession":
        const makeupSessionSemesters = await prisma.semester.findMany({
          select: { id: true, name: true },
        });
        relatedData = {
          userId: currentUserID,
          semesters: makeupSessionSemesters,
        };
        break;
      case "event":
        const eventClass = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        relatedData = { classes: eventClass };
        break;

      case "lesson":
        const Lsubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        const Lclasses = await prisma.class.findMany({
          select: { id: true, name: true, capacity: true },
        });
        relatedData = { subjects: Lsubjects, classes: Lclasses };
        break;
      case "average":
        const RExam = await prisma.exam.findMany({
          select: { id: true, title: true },
        });
        const RStudent = await prisma.student.findMany({
          select: { id: true, name: true },
        });

        relatedData = { exams: RExam, subjects: RStudent };
        break;
      case "result":
        const ResultExam = await prisma.exam.findMany({
          select: { id: true, title: true },
        });
        const ResultSubject = await prisma.subject.findMany({
          select: { id: true, name: true, semesters: true },
        });
        const ResultClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        const ResultSemesters = await prisma.semester.findMany({
          select: { id: true, name: true },
        });

        relatedData = {
          exams: ResultExam,
          subjects: ResultSubject,
          classes: ResultClasses,
          semesters: ResultSemesters,
        };
        break;

      case "semester":
        const ResultSemester = await prisma.semester.findMany({
          select: { id: true, name: true },
        });
        const ResultSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { semesters: ResultSemester, subjects: ResultSubjects };
        break;
      case "attendance":
        const AttendanceStudent = await prisma.student.findMany({
          select: { id: true, name: true, surname: true, username: true },
        });
        const AttendanceSubject = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        const AttendanceClass = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        relatedData = {
          students: AttendanceStudent,
          subjects: AttendanceSubject,
          classes: AttendanceClass,
        };
        break;
      case "attestation":
        relatedData = { studentId: currentUserID };
        break;
      case "fee":
        const feeClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });
        relatedData = { classes: feeClasses };
        break;
      case "invoice":
        const invoiceStudents = await prisma.student.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
            class: { select: { name: true } },
          },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        });
        relatedData = { students: invoiceStudents };
        break;
      case "expense":
        const expenseCategories = await prisma.expenseCategory.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { categories: expenseCategories };
        break;
      case "employee":
        // Enseignants SANS fiche employé (relation inverse `employee: null`).
        // À l'édition d'un employé lié, on inclut aussi son enseignant courant
        // pour que le <select> verrouillé affiche son nom.
        const freeTeachers = await prisma.teacher.findMany({
          where: {
            OR: [
              { employee: null },
              ...(data?.teacherId ? [{ id: data.teacherId }] : []),
            ],
          },
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
          },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        });
        relatedData = { teachers: freeTeachers };
        break;

      default:
        break;
    }
  }

  return (
    <div>
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};
export default FormContainer;
