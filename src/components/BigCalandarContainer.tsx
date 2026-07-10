import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalendar";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";

/** Index de jour (Date.getDay()) par valeur de l'enum Day. */
const DAY_INDEX: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
};

/**
 * Emploi du temps hebdomadaire : affiche les LEÇONS récurrentes (jour + heures)
 * de la classe ou de l'enseignant, plus les examens planifiés.
 * Les leçons sans horaires (données historiques) sont ignorées — les renseigner
 * via le formulaire Leçon.
 */
const BigCalandarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const lessons = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      exams: true,
    },
  });

  // Événements hebdo à partir des leçons (jour + heure du jour).
  const now = new Date();
  const lessonEvents = lessons
    .filter((l) => l.startTime && l.endTime)
    .map((l) => {
      const dayIdx = DAY_INDEX[l.day] ?? 1;
      const base = new Date(now);
      base.setDate(now.getDate() - now.getDay() + dayIdx); // jour de la semaine courante
      const start = new Date(base);
      start.setHours(
        l.startTime!.getUTCHours(),
        l.startTime!.getUTCMinutes(),
        0,
        0
      );
      const end = new Date(base);
      end.setHours(l.endTime!.getUTCHours(), l.endTime!.getUTCMinutes(), 0, 0);
      return {
        title:
          type === "teacherId"
            ? `${l.subject.name} — ${l.class.name}`
            : `${l.subject.name} (${l.name})`,
        start,
        end,
      };
    });

  // Examens planifiés (dates réelles, ramenées à la semaine courante par l'util).
  const examEvents = lessons.flatMap((lesson) =>
    lesson.exams.map((exam) => ({
      title: `Examen : ${exam.title}`,
      start: exam.startTime,
      end: exam.endTime,
    }))
  );

  const schedule = [
    ...lessonEvents,
    ...adjustScheduleToCurrentWeek(examEvents),
  ];

  return (
    <div className="h-full">
      {schedule.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          Aucun créneau planifié. Renseignez les horaires des leçons dans
          « École → Leçons ».
        </p>
      ) : (
        <BigCalendar data={schedule} />
      )}
    </div>
  );
};
export default BigCalandarContainer;
