import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
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
    | "employee"
    | "level"
    | "homework"
    | "observation";
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
  // V03 — cloisonnement : toutes les listes des formulaires sont de l'école de la session
  const schoolId = sessionSchoolId(session);
  let relatedData = {};
  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      case "class":
        const classTeachers = await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true, surname: true },
        });
        // W02 — le formulaire de classe propose le niveau
        const classLevels = await prisma.level.findMany({
          where: { schoolId },
          select: { id: true, name: true, cycle: true },
          orderBy: { order: "asc" },
        });
        relatedData = { teachers: classTeachers, levels: classLevels };
        break;
      case "teacher":
        const teacherSubject = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubject };
        break;
      case "student":
        // W02 — seules les classes de l'année scolaire ACTIVE sont proposées
        // W03 — effectif affiché = inscriptions ACTIVE de la classe
        const studentClasses = await prisma.class.findMany({
          where: { schoolId, schoolYear: { isActive: true } },
          include: {
            _count: {
              select: { enrollments: { where: { status: "ACTIVE" } } },
            },
          },
        });
        relatedData = { classes: studentClasses };
        break;
      case "exam":
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserID! } : {}),
            class: { schoolId },
          },
          // V01 — le régime de la classe de la leçon filtre les périodes du formulaire
          select: {
            id: true,
            name: true,
            class: { select: { evaluationSystem: true } },
          },
        });
        const examSemester = await prisma.semester.findMany({
          // W02 — périodes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true, system: true },
          orderBy: [{ system: "asc" }, { order: "asc" }],
        });

        relatedData = { lessons: examLessons, semesters: examSemester };
        break;

      case "announcement":
        const announceClass = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });

        relatedData = { classes: announceClass };
        break;
      case "quiz":
        const quizClass = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });
        const quizSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });

        relatedData = { classes: quizClass, subjects: quizSubjects };
        break;
      case "makeupSession":
        const makeupSessionSemesters = await prisma.semester.findMany({
          // W02 — périodes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });
        relatedData = {
          userId: currentUserID,
          semesters: makeupSessionSemesters,
        };
        break;
      case "event":
        const eventClass = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });

        relatedData = { classes: eventClass };
        break;

      case "lesson":
        const Lsubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        const Lclasses = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true, capacity: true },
        });
        relatedData = { subjects: Lsubjects, classes: Lclasses };
        break;
      case "average":
        const RExam = await prisma.exam.findMany({
          where: { lesson: { class: { schoolId } } },
          select: { id: true, title: true },
        });
        const RStudent = await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });

        relatedData = { exams: RExam, subjects: RStudent };
        break;
      case "result":
        const ResultExam = await prisma.exam.findMany({
          where: { lesson: { class: { schoolId } } },
          select: { id: true, title: true },
        });
        const ResultSubject = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true, semesters: true },
        });
        const ResultClasses = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });
        const ResultSemesters = await prisma.semester.findMany({
          // W02 — périodes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
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
          // W02 — périodes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });
        const ResultSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        relatedData = { semesters: ResultSemester, subjects: ResultSubjects };
        break;
      case "attendance":
        const AttendanceStudent = await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, name: true, surname: true, username: true },
        });
        const AttendanceSubject = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        const AttendanceClass = await prisma.class.findMany({
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
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
          // W02 — classes de l'année active uniquement
          where: { schoolId, schoolYear: { isActive: true } },
          select: { id: true, name: true },
        });
        relatedData = { classes: feeClasses };
        break;
      case "invoice":
        // W03 — la classe affichée = inscription de l'année active
        const invoiceStudentRows = await prisma.student.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            surname: true,
            enrollments: {
              where: { schoolYear: { isActive: true } },
              select: { class: { select: { name: true } } },
              take: 1,
            },
          },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        });
        const invoiceStudents = invoiceStudentRows.map((s) => ({
          id: s.id,
          name: s.name,
          surname: s.surname,
          class: s.enrollments[0]?.class ?? null,
        }));
        relatedData = { students: invoiceStudents };
        break;
      case "expense":
        const expenseCategories = await prisma.expenseCategory.findMany({
          where: { schoolId },
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
            schoolId,
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

      case "homework":
        // W14 — teacher : uniquement les (classe, matière) où il enseigne
        // (ses Lessons) ; admin/director : toutes les classes de l'année
        // active + toutes les matières de l'école.
        if (role === "teacher") {
          const teacherLessons = await prisma.lesson.findMany({
            where: { teacherId: currentUserID!, class: { schoolId } },
            select: {
              classId: true,
              subjectId: true,
              class: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true } },
            },
          });
          const hwClasses = [
            ...new Map(
              teacherLessons.map((l) => [l.class.id, l.class])
            ).values(),
          ];
          const hwSubjects = [
            ...new Map(
              teacherLessons.map((l) => [l.subject.id, l.subject])
            ).values(),
          ];
          relatedData = {
            classes: hwClasses,
            subjects: hwSubjects,
            pairs: teacherLessons.map((l) => ({
              classId: l.classId,
              subjectId: l.subjectId,
            })),
          };
        } else {
          const hwAllClasses = await prisma.class.findMany({
            // W02 — classes de l'année active uniquement
            where: { schoolId, schoolYear: { isActive: true } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          });
          const hwAllSubjects = await prisma.subject.findMany({
            where: { schoolId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          });
          relatedData = { classes: hwAllClasses, subjects: hwAllSubjects };
        }
        break;

      case "observation":
        // W15 — teacher : uniquement les élèves de SES classes (une Lesson à
        // lui sur la classe de l'inscription de l'année active) ; staff
        // (admin/director/supervisor) : tous les élèves de l'école.
        // La règle est revérifiée côté serveur (observationAction).
        const obsEnrollmentWhere =
          role === "teacher"
            ? {
                schoolYear: { isActive: true as const },
                class: { lessons: { some: { teacherId: currentUserID! } } },
              }
            : { schoolYear: { isActive: true as const } };
        const obsStudentRows = await prisma.student.findMany({
          where: {
            schoolId,
            ...(role === "teacher"
              ? { enrollments: { some: obsEnrollmentWhere } }
              : {}),
          },
          select: {
            id: true,
            name: true,
            surname: true,
            enrollments: {
              where: obsEnrollmentWhere,
              select: { class: { select: { name: true } } },
              take: 1,
            },
          },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        });
        relatedData = {
          students: obsStudentRows.map((s) => ({
            id: s.id,
            name: s.name,
            surname: s.surname,
            className: s.enrollments[0]?.class.name ?? null,
          })),
        };
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
