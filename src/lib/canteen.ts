import "server-only";
import prisma from "./prisma";

/**
 * X01 — Cantine (§2.5) : helpers partagés par les écrans (formules, abonnés,
 * pointage, récapitulatif) et par la facturation (X03).
 *
 * Modèle retenu avec le user (25 juil. 2026) : **forfait + pointage**.
 * - l'élève est abonné à UNE formule par année (CanteenSubscription) ;
 * - le réfectoire pointe chaque jour (MealAttendance, une ligne par élève/jour) ;
 * - un repas EXTRA (non couvert par un forfait) est facturé `MealPlan.unitPrice`.
 *
 * Toutes les dates de pointage sont normalisées à minuit UTC : l'unicité
 * (studentId, date) et les comparaisons de plage ne dépendent alors ni de
 * l'heure de saisie ni du fuseau du navigateur.
 */

/** Libellés FR des statuts d'abonnement (UI + exports). */
export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ENDED: "Résilié",
};

/** Libellés FR des natures de pointage (UI + exports). */
export const MEAL_KIND_LABEL: Record<string, string> = {
  SUBSCRIBED: "Forfait",
  EXTRA: "Repas à l'unité",
  ABSENT: "Absent",
};

/** Libellés FR des périodicités de forfait (partagés avec la grille des frais). */
export const MEAL_PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "Mensuel",
  YEARLY: "Annuel",
  ONE_TIME: "Unique",
};

/**
 * Jour normalisé à 00:00 UTC. Accepte une Date ou une chaîne "YYYY-MM-DD"
 * (valeur d'un <input type="date">, déjà sans fuseau).
 */
export function mealDay(date: Date | string): Date {
  if (typeof date === "string") {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  }
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

/** "YYYY-MM-DD" d'un jour normalisé (valeur d'un <input type="date">). */
export function mealDayInputValue(date: Date): string {
  return mealDay(date).toISOString().slice(0, 10);
}

/** Bornes [début, finExclue) du mois M de l'année Y, en UTC. */
export function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Un abonnement couvre-t-il le jour donné ? Un abonnement SUSPENDED ou ENDED ne
 * couvre rien ; sinon le jour doit tomber dans [startDate, endDate] (endDate
 * null = en cours).
 */
export function coversDay(
  subscription: {
    status: string;
    startDate: Date;
    endDate: Date | null;
  },
  day: Date
): boolean {
  if (subscription.status !== "ACTIVE") return false;
  if (mealDay(subscription.startDate) > day) return false;
  if (subscription.endDate && mealDay(subscription.endDate) < day) return false;
  return true;
}

/**
 * Un abonnement couvre-t-il (au moins un jour) le mois M ? Utilisé par la
 * facturation X03 : un forfait mensuel est dû dès lors que la prise en charge
 * chevauche le mois facturé.
 */
export function coversMonth(
  subscription: { status: string; startDate: Date; endDate: Date | null },
  year: number,
  month: number
): boolean {
  if (subscription.status !== "ACTIVE") return false;
  const { gte: monthStart, lt: monthEnd } = monthRange(year, month);
  if (subscription.startDate >= monthEnd) return false;
  if (subscription.endDate && subscription.endDate < monthStart) return false;
  return true;
}

export type CanteenRecapRow = {
  studentId: string;
  name: string;
  surname: string;
  username: string;
  className: string | null;
  planName: string | null;
  /** Repas couverts par le forfait sur le mois. */
  subscribedMeals: number;
  /** Repas à l'unité sur le mois. */
  extraMeals: number;
  /** Absences pointées (abonné non servi). */
  absences: number;
  /** Montant des repas à l'unité (FCFA). */
  extraAmount: number;
  /** Forfait dû au titre du mois (FCFA, 0 si non abonné ou non couvert). */
  planAmount: number;
};

export type CanteenRecap = {
  rows: CanteenRecapRow[];
  totals: {
    /** Élèves ayant pris au moins un repas dans le mois. */
    diners: number;
    subscribedMeals: number;
    extraMeals: number;
    absences: number;
    /** Repas effectivement servis = forfait + unité. */
    servedMeals: number;
    /** Jours d'ouverture (jours distincts où au moins un repas a été servi). */
    serviceDays: number;
    /** Effectif moyen servi par jour d'ouverture. */
    averagePerDay: number;
    extraAmount: number;
    planAmount: number;
    /** Total dû au titre du mois = forfaits + repas à l'unité. */
    expected: number;
  };
};

/**
 * X04 — Récapitulatif cantine d'un mois (§2.5) : repas servis, effectifs,
 * montants dus. Trois requêtes (abonnements, pointages, inscriptions), tous les
 * croisements se font en mémoire — pas de N+1.
 */
export async function getCanteenRecap(params: {
  schoolId: number;
  schoolYearId: number;
  year: number;
  month: number;
}): Promise<CanteenRecap> {
  const { schoolId, schoolYearId, year, month } = params;
  const range = monthRange(year, month);

  const [meals, subscriptions] = await Promise.all([
    prisma.mealAttendance.findMany({
      where: { schoolId, date: { gte: range.gte, lt: range.lt } },
      select: { studentId: true, kind: true, amount: true, date: true },
    }),
    prisma.canteenSubscription.findMany({
      where: { schoolId, schoolYearId },
      select: {
        studentId: true,
        status: true,
        startDate: true,
        endDate: true,
        mealPlan: { select: { name: true, amount: true, period: true } },
      },
    }),
  ]);

  // Élèves concernés : ceux qui ont mangé OU qui sont abonnés.
  const studentIds = [
    ...new Set([
      ...meals.map((m) => m.studentId),
      ...subscriptions.map((s) => s.studentId),
    ]),
  ];

  const enrollments =
    studentIds.length > 0
      ? await prisma.enrollment.findMany({
          where: { schoolYearId, studentId: { in: studentIds } },
          select: {
            studentId: true,
            class: { select: { name: true } },
            student: {
              select: { name: true, surname: true, username: true },
            },
          },
        })
      : [];
  const infoByStudent = new Map(enrollments.map((e) => [e.studentId, e]));

  const subByStudent = new Map(subscriptions.map((s) => [s.studentId, s]));

  type Agg = {
    subscribedMeals: number;
    extraMeals: number;
    absences: number;
    extraAmount: number;
  };
  const aggByStudent = new Map<string, Agg>();
  const serviceDays = new Set<string>();

  for (const m of meals) {
    const agg =
      aggByStudent.get(m.studentId) ??
      { subscribedMeals: 0, extraMeals: 0, absences: 0, extraAmount: 0 };
    if (m.kind === "SUBSCRIBED") agg.subscribedMeals += 1;
    else if (m.kind === "EXTRA") {
      agg.extraMeals += 1;
      agg.extraAmount += m.amount;
    } else agg.absences += 1;
    aggByStudent.set(m.studentId, agg);
    if (m.kind !== "ABSENT") serviceDays.add(m.date.toISOString().slice(0, 10));
  }

  const rows: CanteenRecapRow[] = studentIds
    .map((studentId) => {
      const info = infoByStudent.get(studentId);
      const sub = subByStudent.get(studentId);
      const agg =
        aggByStudent.get(studentId) ??
        { subscribedMeals: 0, extraMeals: 0, absences: 0, extraAmount: 0 };

      // Forfait dû ce mois-ci : mensuel couvrant le mois, ou forfait annuel/
      // unique dont la prise en charge DÉMARRE ce mois-ci (règle X03).
      let planAmount = 0;
      if (sub && coversMonth(sub, year, month)) {
        if (sub.mealPlan.period === "MONTHLY") planAmount = sub.mealPlan.amount;
        else if (
          sub.startDate.getUTCFullYear() === year &&
          sub.startDate.getUTCMonth() + 1 === month
        ) {
          planAmount = sub.mealPlan.amount;
        }
      }

      return {
        studentId,
        name: info?.student.name ?? "—",
        surname: info?.student.surname ?? "",
        username: info?.student.username ?? "",
        className: info?.class.name ?? null,
        planName: sub?.mealPlan.name ?? null,
        subscribedMeals: agg.subscribedMeals,
        extraMeals: agg.extraMeals,
        absences: agg.absences,
        extraAmount: agg.extraAmount,
        planAmount,
      };
    })
    .sort(
      (a, b) =>
        (a.className ?? "").localeCompare(b.className ?? "", "fr") ||
        a.name.localeCompare(b.name, "fr")
    );

  const servedMeals = rows.reduce(
    (sum, r) => sum + r.subscribedMeals + r.extraMeals,
    0
  );
  const totals = {
    diners: rows.filter((r) => r.subscribedMeals + r.extraMeals > 0).length,
    subscribedMeals: rows.reduce((s, r) => s + r.subscribedMeals, 0),
    extraMeals: rows.reduce((s, r) => s + r.extraMeals, 0),
    absences: rows.reduce((s, r) => s + r.absences, 0),
    servedMeals,
    serviceDays: serviceDays.size,
    averagePerDay:
      serviceDays.size > 0
        ? Math.round((servedMeals / serviceDays.size) * 10) / 10
        : 0,
    extraAmount: rows.reduce((s, r) => s + r.extraAmount, 0),
    planAmount: rows.reduce((s, r) => s + r.planAmount, 0),
    expected: 0,
  };
  totals.expected = totals.planAmount + totals.extraAmount;

  return { rows, totals };
}

export type CanteenRosterRow = {
  studentId: string;
  name: string;
  surname: string;
  username: string;
  className: string | null;
  /** Abonnement de l'année (null = non abonné : seul un EXTRA est possible). */
  subscription: {
    id: number;
    status: string;
    mealPlanId: number;
    mealPlanName: string;
    unitPrice: number | null;
    startDate: Date;
    endDate: Date | null;
  } | null;
  /** Pointage déjà saisi pour le jour demandé (null = pas encore pointé). */
  meal: { id: number; kind: string; amount: number } | null;
};

/**
 * Liste de pointage d'un jour (X02) : tous les élèves inscrits de l'année,
 * leur abonnement cantine et leur pointage éventuel — en 2 requêtes, sans N+1.
 * `classId` restreint à une classe (le réfectoire pointe classe par classe).
 */
export async function getCanteenRoster(params: {
  schoolId: number;
  schoolYearId: number;
  day: Date;
  classId?: number;
}): Promise<CanteenRosterRow[]> {
  const { schoolId, schoolYearId, classId } = params;
  const day = mealDay(params.day);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolYearId,
      status: "ACTIVE",
      ...(classId ? { classId } : {}),
      student: { schoolId },
    },
    select: {
      classId: true,
      class: { select: { name: true } },
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          username: true,
          canteenSubscriptions: {
            where: { schoolYearId },
            select: {
              id: true,
              status: true,
              mealPlanId: true,
              startDate: true,
              endDate: true,
              mealPlan: { select: { name: true, unitPrice: true } },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: [
      { class: { name: "asc" } },
      { student: { name: "asc" } },
      { student: { surname: "asc" } },
    ],
  });

  const meals = await prisma.mealAttendance.findMany({
    where: {
      schoolId,
      date: day,
      studentId: { in: enrollments.map((e) => e.student.id) },
    },
    select: { id: true, studentId: true, kind: true, amount: true },
  });
  const mealByStudent = new Map(meals.map((m) => [m.studentId, m]));

  return enrollments.map((e) => {
    const sub = e.student.canteenSubscriptions[0];
    const meal = mealByStudent.get(e.student.id);
    return {
      studentId: e.student.id,
      name: e.student.name,
      surname: e.student.surname,
      username: e.student.username,
      className: e.class?.name ?? null,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            mealPlanId: sub.mealPlanId,
            mealPlanName: sub.mealPlan.name,
            unitPrice: sub.mealPlan.unitPrice,
            startDate: sub.startDate,
            endDate: sub.endDate,
          }
        : null,
      meal: meal
        ? { id: meal.id, kind: meal.kind, amount: meal.amount }
        : null,
    };
  });
}
