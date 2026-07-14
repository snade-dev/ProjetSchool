import Link from "next/link";
import { ClipboardCheck, UserX, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";

/**
 * W07 — Tableau de bord du SURVEILLANT GÉNÉRAL (§2.7.6) : présences et
 * discipline. Vue du jour : les absents par classe (requête simple sur les
 * Attendance du jour civil courant, cloisonnée à l'école de la session),
 * avec raccourci direct vers la feuille d'appel.
 */
const SupervisorPage = async () => {
  const schoolId = (await getSessionInfo())?.schoolId ?? -1;

  // Bornes du jour civil courant (UTC) — même convention que le dashboard admin.
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const nextDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  const todayAttendances = await prisma.attendance.findMany({
    where: {
      date: { gte: dayStart, lt: nextDay },
      class: { schoolId },
    },
    select: {
      present: true,
      sessionDay: true,
      classId: true,
      class: { select: { name: true } },
      student: { select: { id: true, name: true, surname: true } },
    },
    orderBy: [{ classId: "asc" }],
  });

  const pointes = todayAttendances.length;
  const absents = todayAttendances.filter((a) => !a.present);

  // Absents groupés par classe (dédoublonnés par élève : matin/soir,
  // plusieurs matières → une ligne par élève et par classe).
  const byClass = new Map<
    number,
    { className: string; students: Map<string, { label: string; sessions: Set<string> }> }
  >();
  for (const a of absents) {
    if (!byClass.has(a.classId)) {
      byClass.set(a.classId, { className: a.class.name, students: new Map() });
    }
    const entry = byClass.get(a.classId)!;
    const label = `${a.student.name} ${a.student.surname}`;
    if (!entry.students.has(a.student.id)) {
      entry.students.set(a.student.id, { label, sessions: new Set() });
    }
    entry.students.get(a.student.id)!.sessions.add(a.sessionDay);
  }
  const classes = [...byClass.entries()].sort((a, b) =>
    a[1].className.localeCompare(b[1].className, "fr")
  );
  const absentCount = classes.reduce(
    (sum, [, c]) => sum + c.students.size,
    0
  );

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(now);

  const sessionLabel = (s: string) =>
    s === "MORNING" ? "Matin" : s === "EVENING" ? "Soir" : s;

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* En-tête + tuiles du jour */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Surveillance — absents du jour</h1>
          <p className="text-sm text-gray-400">{dateLabel}</p>
        </div>
        <Link
          href="/list/attendances/appel"
          className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white text-sm font-semibold rounded-md px-4 py-2 transition w-fit"
        >
          <ClipboardCheck size={16} />
          Faire l&apos;appel
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-lamaSkyLight text-sky-600">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Pointages du jour</span>
            <span className="text-lg font-semibold text-gray-700">{pointes}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full ${
              absentCount > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            <UserX className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Élèves absents</span>
            <span
              className={`text-lg font-semibold ${
                absentCount > 0 ? "text-red-600" : "text-gray-700"
              }`}
            >
              {absentCount}
            </span>
          </div>
        </div>
      </div>

      {/* Absents par classe */}
      {pointes === 0 ? (
        <div className="bg-white rounded-md p-8 text-center text-sm text-gray-400">
          Aucun appel n&apos;a encore été fait aujourd&apos;hui.
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-md p-8 text-center text-sm text-gray-500">
          Aucun absent aujourd&apos;hui. 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classes.map(([classId, c]) => (
            <div key={classId} className="bg-white rounded-md p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-md font-semibold">{c.className}</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600">
                  {c.students.size} absent(s)
                </span>
              </div>
              <ul className="divide-y divide-gray-100 text-sm">
                {[...c.students.entries()].map(([studentId, s]) => (
                  <li
                    key={studentId}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/list/students/${studentId}`}
                      className="hover:underline"
                    >
                      {s.label}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {[...s.sessions].map(sessionLabel).join(" + ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupervisorPage;
