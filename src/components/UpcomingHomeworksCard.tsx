import prisma from "@/lib/prisma";
import { formatDueDate, homeworkDueBadge } from "@/lib/homework";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

/**
 * W14 — « calendrier consolidé » des devoirs (§2.3.8), version carte.
 *
 * CHOIX D'IMPLÉMENTATION : les dashboards élève/parent n'ont pas de calendrier
 * d'ÉVÉNEMENTS — leur BigCalandarContainer est l'emploi du temps hebdomadaire
 * RÉCURRENT des leçons (react-big-calendar en vue work_week, alimenté par
 * Lesson.day/startTime). Y injecter des échéances ponctuelles datées aurait
 * dénaturé l'emploi du temps ; on livre donc la carte « Devoirs à venir »
 * (7 prochains jours) prévue en alternative par le plan, avec lien vers la
 * liste complète /list/homeworks.
 */
const UpcomingHomeworksCard = async ({
  classIds,
  showClass = false,
}: {
  /** Classes concernées : celle de l'élève, ou celles des enfants (parent). */
  classIds: number[];
  /** Afficher la classe (utile au parent multi-enfants). */
  showClass?: boolean;
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 7);

  const homeworks =
    classIds.length === 0
      ? []
      : await prisma.homework.findMany({
          where: {
            classId: { in: classIds },
            dueDate: { gte: today, lt: horizon },
          },
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 8,
        });

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpenCheck size={18} className="text-gray-500" />
          Devoirs à venir
        </h2>
        <Link
          href="/list/homeworks"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Tout voir
        </Link>
      </div>
      {homeworks.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">
          Aucun devoir à rendre dans les 7 prochains jours.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {homeworks.map((hw) => {
            const badge = homeworkDueBadge(hw.dueDate, today);
            return (
              <li key={hw.id}>
                <Link
                  href={`/list/homeworks/${hw.id}`}
                  className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2.5 hover:bg-lamaSkyLight transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {hw.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {hw.subject.name}
                      {showClass ? ` — ${hw.class.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-600">
                      {formatDueDate(hw.dueDate)}
                    </span>
                    {badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UpcomingHomeworksCard;
