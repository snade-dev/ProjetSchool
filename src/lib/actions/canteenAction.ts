"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { requireRole, requireSchool } from "../authGuard";
import { auditWithSession, auditDiff } from "../audit";
import { getActiveSchoolYear } from "../schoolYear";
import { deleteErrorMessage } from "../actionErrors";
import { mealDay } from "../canteen";
import {
  MealPlanSchema,
  CanteenSubscriptionSchema,
} from "../formsValidationSchema";

/**
 * X01/X02 — Actions cantine (§2.5).
 * Rôles : la direction (admin/director) gère les formules et les abonnements ;
 * le surveillant (supervisor) et le comptable peuvent pointer les repas (X02),
 * gestes quotidiens du réfectoire. Toute écriture est auditée (W10).
 */

type CurrentState = { success: boolean; error: boolean };
type DeleteState = { success: boolean; error: boolean; message?: string };

const CANTEEN_ADMIN = ["admin", "director"];
const CANTEEN_DESK = ["admin", "director", "accountant", "supervisor"];

// ---------------------------------------------------------------------------
// Formules de restauration (MealPlan)
// ---------------------------------------------------------------------------

export const createMealPlan = async (
  currentState: CurrentState,
  data: MealPlanSchema
) => {
  try {
    const session = await requireSchool(CANTEEN_ADMIN);
    const { schoolId } = session;
    const activeYear = await getActiveSchoolYear(schoolId);

    const created = await prisma.mealPlan.create({
      data: {
        schoolId,
        schoolYearId: activeYear.id,
        name: data.name,
        description: data.description || null,
        period: data.period,
        amount: data.amount,
        unitPrice: data.unitPrice ?? null,
        active: data.active ?? true,
      },
    });

    await auditWithSession(
      session,
      "canteen.plan_create",
      `MealPlan#${created.id}`,
      {
        after: {
          name: data.name,
          period: data.period,
          amount: data.amount,
          unitPrice: data.unitPrice ?? null,
        },
      }
    );

    revalidatePath("/list/canteen");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateMealPlan = async (
  currentState: CurrentState,
  data: MealPlanSchema
) => {
  try {
    const session = await requireRole(CANTEEN_ADMIN);

    const before = await prisma.mealPlan.findUnique({
      where: { id: data.id },
      select: {
        name: true,
        description: true,
        period: true,
        amount: true,
        unitPrice: true,
        active: true,
        schoolId: true,
      },
    });
    // Cloisonnement : on ne modifie jamais la formule d'une autre école.
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true };
    }

    await prisma.mealPlan.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        period: data.period,
        amount: data.amount,
        unitPrice: data.unitPrice ?? null,
        active: data.active ?? true,
      },
    });

    const diff = auditDiff(before as unknown as Record<string, unknown>, {
      name: data.name,
      description: data.description || null,
      period: data.period,
      amount: data.amount,
      unitPrice: data.unitPrice ?? null,
      active: data.active ?? true,
    });
    if (diff.changed) {
      await auditWithSession(
        session,
        "canteen.plan_update",
        `MealPlan#${data.id}`,
        { before: diff.before, after: diff.after, schoolId: before.schoolId }
      );
    }

    revalidatePath("/list/canteen");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteMealPlan = async (
  currentState: DeleteState,
  data: FormData
): Promise<DeleteState> => {
  const id = parseInt(data.get("id") as string);
  try {
    const session = await requireRole(CANTEEN_ADMIN);

    const before = await prisma.mealPlan.findUnique({
      where: { id },
      select: { name: true, amount: true, period: true, schoolId: true },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true, message: "Formule introuvable." };
    }

    await prisma.mealPlan.delete({ where: { id } });

    await auditWithSession(session, "canteen.plan_delete", `MealPlan#${id}`, {
      before: {
        name: before.name,
        amount: before.amount,
        period: before.period,
      },
      schoolId: before.schoolId,
    });

    revalidatePath("/list/canteen");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// ---------------------------------------------------------------------------
// Abonnements (CanteenSubscription)
// ---------------------------------------------------------------------------

export const createCanteenSubscription = async (
  currentState: CurrentState,
  data: CanteenSubscriptionSchema
) => {
  try {
    const session = await requireSchool(CANTEEN_ADMIN);
    const { schoolId } = session;
    const activeYear = await getActiveSchoolYear(schoolId);

    // Cloisonnement : élève et formule doivent appartenir à l'école de la session.
    const [student, plan] = await Promise.all([
      prisma.student.findFirst({
        where: { id: data.studentId, schoolId },
        select: { id: true },
      }),
      prisma.mealPlan.findFirst({
        where: { id: data.mealPlanId, schoolId },
        select: { id: true, name: true },
      }),
    ]);
    if (!student || !plan) return { success: false, error: true };

    const created = await prisma.canteenSubscription.create({
      data: {
        schoolId,
        schoolYearId: activeYear.id,
        studentId: data.studentId,
        mealPlanId: data.mealPlanId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        status: data.status ?? "ACTIVE",
        note: data.note || null,
        createdById: session.userId,
      },
    });

    await auditWithSession(
      session,
      "canteen.subscription_create",
      `CanteenSubscription#${created.id}`,
      {
        after: {
          studentId: data.studentId,
          mealPlan: plan.name,
          startDate: data.startDate,
          status: data.status ?? "ACTIVE",
        },
      }
    );

    revalidatePath("/list/canteen/subscriptions");
    return { success: true, error: false };
  } catch (err) {
    // P2002 = l'élève a déjà un abonnement cette année (unicité studentId+année)
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateCanteenSubscription = async (
  currentState: CurrentState,
  data: CanteenSubscriptionSchema
) => {
  try {
    const session = await requireRole(CANTEEN_ADMIN);

    const before = await prisma.canteenSubscription.findUnique({
      where: { id: data.id },
      select: {
        mealPlanId: true,
        startDate: true,
        endDate: true,
        status: true,
        note: true,
        schoolId: true,
      },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true };
    }

    const plan = await prisma.mealPlan.findFirst({
      where: { id: data.mealPlanId, schoolId: before.schoolId },
      select: { id: true },
    });
    if (!plan) return { success: false, error: true };

    await prisma.canteenSubscription.update({
      where: { id: data.id },
      data: {
        mealPlanId: data.mealPlanId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        status: data.status ?? "ACTIVE",
        note: data.note || null,
      },
    });

    const diff = auditDiff(before as unknown as Record<string, unknown>, {
      mealPlanId: data.mealPlanId,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      status: data.status ?? "ACTIVE",
      note: data.note || null,
    });
    if (diff.changed) {
      await auditWithSession(
        session,
        "canteen.subscription_update",
        `CanteenSubscription#${data.id}`,
        { before: diff.before, after: diff.after, schoolId: before.schoolId }
      );
    }

    revalidatePath("/list/canteen/subscriptions");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteCanteenSubscription = async (
  currentState: DeleteState,
  data: FormData
): Promise<DeleteState> => {
  const id = parseInt(data.get("id") as string);
  try {
    const session = await requireRole(CANTEEN_ADMIN);

    const before = await prisma.canteenSubscription.findUnique({
      where: { id },
      select: { studentId: true, mealPlanId: true, schoolId: true },
    });
    if (!before || before.schoolId !== session.schoolId) {
      return { success: false, error: true, message: "Abonnement introuvable." };
    }

    await prisma.canteenSubscription.delete({ where: { id } });

    await auditWithSession(
      session,
      "canteen.subscription_delete",
      `CanteenSubscription#${id}`,
      {
        before: { studentId: before.studentId, mealPlanId: before.mealPlanId },
        schoolId: before.schoolId,
      }
    );

    revalidatePath("/list/canteen/subscriptions");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};

// ---------------------------------------------------------------------------
// X02 — Pointage du réfectoire (MealAttendance)
// ---------------------------------------------------------------------------

export type MealPointageEntry = {
  studentId: string;
  kind: "SUBSCRIBED" | "EXTRA" | "ABSENT" | "NONE";
};

/**
 * Enregistre le pointage d'un jour pour une liste d'élèves (X02).
 * Idempotent : ré-enregistrer le même jour MET À JOUR les lignes existantes
 * (unicité studentId+date) ; `kind: "NONE"` retire le pointage.
 * Le montant d'un EXTRA vient du prix unitaire de la formule de l'élève, ou à
 * défaut de la formule active la moins chère de l'école — jamais du client.
 */
export const saveMealPointage = async (
  currentState: CurrentState,
  payload: { date: string; entries: MealPointageEntry[] }
) => {
  try {
    const session = await requireSchool(CANTEEN_DESK);
    const { schoolId } = session;
    const activeYear = await getActiveSchoolYear(schoolId);
    const day = mealDay(payload.date);

    const studentIds = payload.entries.map((e) => e.studentId);
    if (studentIds.length === 0) return { success: true, error: false };

    // Élèves réellement inscrits dans l'école cette année (défense en profondeur)
    const enrolled = await prisma.enrollment.findMany({
      where: {
        schoolYearId: activeYear.id,
        studentId: { in: studentIds },
        student: { schoolId },
      },
      select: {
        studentId: true,
        student: {
          select: {
            canteenSubscriptions: {
              where: { schoolYearId: activeYear.id },
              select: {
                mealPlanId: true,
                mealPlan: { select: { unitPrice: true } },
              },
              take: 1,
            },
          },
        },
      },
    });
    const subByStudent = new Map(
      enrolled.map((e) => [e.studentId, e.student.canteenSubscriptions[0]])
    );

    // Prix de repli pour un élève non abonné : formule active la moins chère.
    const fallbackPlan = await prisma.mealPlan.findFirst({
      where: {
        schoolId,
        schoolYearId: activeYear.id,
        active: true,
        unitPrice: { not: null },
      },
      orderBy: { unitPrice: "asc" },
      select: { id: true, unitPrice: true },
    });

    const valid = payload.entries.filter((e) => subByStudent.has(e.studentId));

    await prisma.$transaction(
      async (tx) => {
        for (const entry of valid) {
          if (entry.kind === "NONE") {
            await tx.mealAttendance.deleteMany({
              where: { studentId: entry.studentId, date: day },
            });
            continue;
          }
          const sub = subByStudent.get(entry.studentId);
          const planId = sub?.mealPlanId ?? fallbackPlan?.id ?? null;
          const unitPrice =
            sub?.mealPlan.unitPrice ?? fallbackPlan?.unitPrice ?? 0;
          const amount = entry.kind === "EXTRA" ? unitPrice : 0;

          await tx.mealAttendance.upsert({
            where: {
              studentId_date: { studentId: entry.studentId, date: day },
            },
            create: {
              schoolId,
              studentId: entry.studentId,
              date: day,
              kind: entry.kind,
              mealPlanId: planId,
              amount,
              recordedById: session.userId,
            },
            update: {
              kind: entry.kind,
              mealPlanId: planId,
              amount,
              recordedById: session.userId,
            },
          });
        }
      },
      { timeout: 30000 }
    );

    await auditWithSession(
      session,
      "canteen.pointage",
      `MealAttendance@${payload.date}`,
      {
        after: {
          date: payload.date,
          served: valid.filter((e) => e.kind !== "ABSENT" && e.kind !== "NONE")
            .length,
          absent: valid.filter((e) => e.kind === "ABSENT").length,
        },
      }
    );

    revalidatePath("/list/canteen/pointage");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
