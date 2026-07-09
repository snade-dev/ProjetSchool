import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import RollCallClient from "./RollCallClient";

/**
 * Feuille d'appel (refonte présence) : l'enseignant/admin choisit
 * (classe, matière, date, session) et pointe toute la classe d'un coup.
 * Un teacher ne voit que les classes/matières de ses Lessons.
 */
const RollCallPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (!role || !userId || !["admin", "teacher"].includes(role)) {
    return notFound();
  }

  // Couples (classe, matière) autorisés : tout pour l'admin, ses Lessons pour un teacher.
  const lessons = await prisma.lesson.findMany({
    where: role === "teacher" ? { teacherId: userId } : {},
    select: {
      classId: true,
      subjectId: true,
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  // Classes distinctes, puis matières par classe.
  const classesMap = new Map<number, { id: number; name: string }>();
  const subjectsByClass = new Map<number, Map<number, { id: number; name: string }>>();
  for (const l of lessons) {
    classesMap.set(l.classId, l.class);
    if (!subjectsByClass.has(l.classId)) subjectsByClass.set(l.classId, new Map());
    subjectsByClass.get(l.classId)!.set(l.subjectId, l.subject);
  }
  // Admin : si aucune Lesson (données incomplètes), retomber sur toutes les classes/matières.
  if (role === "admin" && classesMap.size === 0) {
    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({ select: { id: true, name: true } }),
      prisma.subject.findMany({ select: { id: true, name: true } }),
    ]);
    for (const c of classes) {
      classesMap.set(c.id, c);
      subjectsByClass.set(c.id, new Map(subjects.map((s) => [s.id, s])));
    }
  }

  const classes = [...classesMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );

  const classId = searchParams.classId ? parseInt(searchParams.classId) : classes[0]?.id;
  const selectedClass = classes.find((c) => c.id === classId) ?? classes[0];

  const subjects = selectedClass
    ? [...(subjectsByClass.get(selectedClass.id)?.values() ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "fr")
      )
    : [];
  const subjectId = searchParams.subjectId
    ? parseInt(searchParams.subjectId)
    : subjects[0]?.id;
  const selectedSubject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  const today = new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "")
    ? (searchParams.date as string)
    : today;
  const sessionDay = searchParams.session === "EVENING" ? "EVENING" : "MORNING";

  // Élèves de la classe + pointages existants du (jour, session, matière).
  let students: { id: string; name: string; surname: string }[] = [];
  let existing: Record<string, boolean> = {};
  if (selectedClass && selectedSubject) {
    const day = new Date(`${date}T00:00:00`);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const [studentRows, attendanceRows] = await Promise.all([
      prisma.student.findMany({
        where: { classId: selectedClass.id },
        select: { id: true, name: true, surname: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
      prisma.attendance.findMany({
        where: {
          classId: selectedClass.id,
          subjectId: selectedSubject.id,
          sessionDay,
          date: { gte: day, lt: nextDay },
        },
        select: { studentId: true, present: true },
      }),
    ]);
    students = studentRows;
    existing = Object.fromEntries(
      attendanceRows.map((a) => [a.studentId, a.present])
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <h1 className="text-lg font-semibold">Faire l&apos;appel</h1>
      <p className="text-sm text-gray-400 mt-1">
        Choisissez la classe, la matière, la date et la session, puis pointez
        les présences de toute la classe en un seul enregistrement.
      </p>

      <RollCallClient
        classes={classes}
        subjects={subjects}
        selectedClassId={selectedClass?.id ?? null}
        selectedSubjectId={selectedSubject?.id ?? null}
        date={date}
        sessionDay={sessionDay}
        students={students}
        existing={existing}
      />
    </div>
  );
};

export default RollCallPage;
