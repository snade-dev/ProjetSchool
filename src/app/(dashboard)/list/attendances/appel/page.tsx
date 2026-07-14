import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sessionSchoolId } from "@/lib/authGuard";
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
    // W02 — repli scopé à l'école ET à l'année scolaire active
    const schoolId = sessionSchoolId(session);
    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId, schoolYear: { isActive: true } },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
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

  // Annuaire des élèves des classes autorisées (recherche directe d'un élève,
  // bascule automatique vers sa classe).
  // W03 — via les inscriptions (Enrollment) des classes autorisées
  const allEnrollments = await prisma.enrollment.findMany({
    where: { classId: { in: classes.map((c) => c.id) } },
    select: {
      classId: true,
      student: { select: { id: true, name: true, surname: true } },
    },
    orderBy: [{ student: { name: "asc" } }, { student: { surname: "asc" } }],
  });
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));
  const directory = allEnrollments.map((e) => ({
    ...e.student,
    classId: e.classId,
    className: classNameById.get(e.classId) ?? "",
  }));

  const today = new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "")
    ? (searchParams.date as string)
    : today;
  const sessionDay = searchParams.session === "EVENING" ? "EVENING" : "MORNING";

  // Historique des appels (classe, matière) : un groupe par (jour, session),
  // chaque appel passé restant modifiable via sa date/session.
  type HistoryRow = {
    date: string; // yyyy-MM-dd
    label: string;
    sessionDay: "MORNING" | "EVENING";
    present: number;
    absent: number;
  };
  let history: HistoryRow[] = [];

  // Élèves de la classe + pointages existants du (jour, session, matière).
  let students: { id: string; name: string; surname: string }[] = [];
  let existing: Record<string, boolean> = {};
  if (selectedClass && selectedSubject) {
    const day = new Date(`${date}T00:00:00`);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const [enrollmentRows, attendanceRows, historyRows] = await Promise.all([
      // W03 — élèves de la classe = ses inscriptions
      prisma.enrollment.findMany({
        where: { classId: selectedClass.id },
        select: {
          student: { select: { id: true, name: true, surname: true } },
        },
        orderBy: [{ student: { name: "asc" } }, { student: { surname: "asc" } }],
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
      prisma.attendance.findMany({
        where: { classId: selectedClass.id, subjectId: selectedSubject.id },
        select: { date: true, sessionDay: true, present: true },
        orderBy: { date: "desc" },
        take: 600,
      }),
    ]);
    students = enrollmentRows.map((e) => e.student);
    existing = Object.fromEntries(
      attendanceRows.map((a) => [a.studentId, a.present])
    );

    // Agrégation par (jour, session) — l'historique complet reste en base.
    const groups = new Map<string, HistoryRow>();
    for (const row of historyRows) {
      const d = row.date.toISOString().slice(0, 10);
      const key = `${d}:${row.sessionDay}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          date: d,
          label: new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(row.date),
          sessionDay: row.sessionDay as "MORNING" | "EVENING",
          present: 0,
          absent: 0,
        };
        groups.set(key, g);
      }
      if (row.present) g.present += 1;
      else g.absent += 1;
    }
    history = [...groups.values()].slice(0, 15);
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
        directory={directory}
        focusId={searchParams.focus ?? null}
      />

      {/* Historique des appels : chaque jour reste modifiable */}
      {history.length > 0 && selectedClass && selectedSubject && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Historique des appels — {selectedClass.name} ·{" "}
            {selectedSubject.name}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="p-2">Date</th>
                <th className="p-2">Session</th>
                <th className="p-2">Présents</th>
                <th className="p-2">Absents</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const isCurrent = h.date === date && h.sessionDay === sessionDay;
                return (
                  <tr
                    key={`${h.date}-${h.sessionDay}`}
                    className={`border-b border-gray-100 even:bg-slate-50 ${
                      isCurrent ? "bg-lamaSkyLight" : ""
                    }`}
                  >
                    <td className="p-2 capitalize">{h.label}</td>
                    <td className="p-2">
                      {h.sessionDay === "MORNING" ? "Matin" : "Soir"}
                    </td>
                    <td className="p-2 text-green-600 font-semibold">
                      {h.present}
                    </td>
                    <td className="p-2 text-red-500 font-semibold">
                      {h.absent}
                    </td>
                    <td className="p-2">
                      <a
                        href={`/list/attendances/appel?classId=${selectedClass.id}&subjectId=${selectedSubject.id}&date=${h.date}&session=${h.sessionDay}`}
                        className="text-blue-500 hover:text-blue-600 text-xs font-semibold"
                      >
                        {isCurrent ? "En cours d'édition" : "Modifier"}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RollCallPage;
