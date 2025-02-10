import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

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
    | "quiz"
    | "attestation";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserID = userId;
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
          select: { id: true, name: true },
        });

        relatedData = { lessons: examLessons };
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
          select: { id: true, name: true,capacity: true },
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
          select: { id: true, name: true },
        });

        relatedData = { exams: ResultExam, subjects: ResultSubject };
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
        relatedData= {studentId: currentUserID}

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
