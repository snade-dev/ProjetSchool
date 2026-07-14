/**
 * W14 — Devoirs à faire (§2.3.8) : helpers PARTAGÉS client/serveur
 * (pas de "server-only" : utilisés par les pages liste ET les cartes
 * des dashboards).
 */

export type HomeworkDueBadge = {
  label: string;
  className: string;
};

/** Début du jour (minuit local) d'une date. */
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Badge d'échéance d'un devoir : « En retard » (date de rendu passée),
 * « Aujourd'hui », « Demain », sinon null (échéance lointaine).
 */
export function homeworkDueBadge(
  dueDate: Date,
  now: Date = new Date()
): HomeworkDueBadge | null {
  const today = dayStart(now).getTime();
  const due = dayStart(dueDate).getTime();
  const diffDays = Math.round((due - today) / 86_400_000);

  if (diffDays < 0)
    return { label: "En retard", className: "bg-red-100 text-red-700" };
  if (diffDays === 0)
    return { label: "Aujourd'hui", className: "bg-orange-100 text-orange-700" };
  if (diffDays === 1)
    return { label: "Demain", className: "bg-yellow-100 text-yellow-700" };
  return null;
}

/** Format court FR d'une date de rendu. */
export const formatDueDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
