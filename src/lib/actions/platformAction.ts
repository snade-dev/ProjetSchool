"use server";

import { z } from "zod";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { auditWithSession } from "../audit";
import { createAuthUser, removeAuthUser } from "../authAdmin";
import { ensureMembership, SPACE_ROLES, SPACE_ROLE_LABELS } from "../membership";
import { revalidatePath } from "next/cache";

/**
 * V04 — actions de l'espace plateforme (/platform, rôle superadmin) :
 * création d'une école avec son premier compte admin, activation/coupure.
 */

export type PlatformState = {
  success: boolean;
  error: boolean;
  message: string;
};

const createSchoolSchema = z.object({
  name: z.string().min(2, "Le nom de l'école est requis (2 caractères min)."),
  adminName: z.string().min(2, "Le nom de l'administrateur est requis."),
  adminEmail: z.string().email("Adresse e-mail de l'administrateur invalide."),
  adminPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents (combining marks après NFD) // accents (combining marks après NFD)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Crée une école + son premier compte admin (compensation si le compte échoue). */
export const createSchool = async (
  currentState: PlatformState,
  formData: FormData
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);

    const parsed = createSchoolSchema.safeParse({
      name: formData.get("name"),
      adminName: formData.get("adminName"),
      adminEmail: formData.get("adminEmail"),
      adminPassword: formData.get("adminPassword"),
    });
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }
    const { name, adminName, adminEmail, adminPassword } = parsed.data;

    // Slug unique : base + suffixe numérique si déjà pris.
    const base = slugify(name) || "ecole";
    let slug = base;
    for (let i = 2; await prisma.school.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }

    const school = await prisma.school.create({ data: { name, slug } });

    let adminId: string;
    try {
      adminId = await createAuthUser({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: "admin",
      });
    } catch (err: any) {
      // compensation : pas d'école sans admin
      await prisma.school.delete({ where: { id: school.id } });
      return { success: false, error: true, message: err.message };
    }

    try {
      // rattacher l'admin à SA nouvelle école (le superadmin n'a pas d'école,
      // createAuthUser n'a donc rien posé automatiquement) — contexte actif
      // + membership (W06) dans la même transaction.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: adminId },
          data: { schoolId: school.id },
        });
        await ensureMembership(adminId, school.id, "admin", tx);
      });
    } catch (err) {
      await removeAuthUser(adminId);
      await prisma.school.delete({ where: { id: school.id } });
      throw err;
    }

    // W10 — journal d'audit : création d'un établissement (§2.11.2) —
    // journalisée avec le schoolId de l'école CIBLE (§2.11.5).
    await auditWithSession(session, "school.create", `School#${school.id}`, {
      after: { name, slug, adminEmail },
      schoolId: school.id,
    });

    revalidatePath("/platform");
    return {
      success: true,
      error: false,
      message: `École « ${name} » créée (slug ${slug}) avec son admin ${adminEmail}.`,
    };
  } catch (error) {
    console.error("createSchool:", error);
    return {
      success: false,
      error: true,
      message: "Création impossible — vérifiez les champs et réessayez.",
    };
  }
};

/** Active ou coupe une école (la coupure bloquera la connexion en V06). */
export const toggleSchoolActive = async (
  schoolId: number,
  active: boolean
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { active },
      select: { name: true },
    });

    // W10 — journal d'audit : suspension/réactivation d'une école (§2.11.2),
    // journalisée avec le schoolId de l'école CIBLE (§2.11.5).
    await auditWithSession(
      session,
      active ? "school.activate" : "school.suspend",
      `School#${schoolId}`,
      {
        before: { active: !active },
        after: { active, name: school.name },
        schoolId,
      }
    );

    revalidatePath("/platform");
    return {
      success: true,
      error: false,
      message: active ? "École réactivée." : "École coupée.",
    };
  } catch (error) {
    console.error("toggleSchoolActive:", error);
    return { success: false, error: true, message: "Opération impossible." };
  }
};

/* ------------------------------------------------------------------ */
/* V05 — Plans & abonnements (encaissement manuel)                     */
/* ------------------------------------------------------------------ */

const planSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2, "Le nom du plan est requis."),
  priceMonthly: z.coerce.number().int().min(0, "Prix mensuel invalide."),
  maxStudents: z
    .union([z.literal(""), z.coerce.number().int().min(1)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  active: z.coerce.boolean().optional().default(true),
});

/** Crée ou met à jour un plan d'abonnement. */
export const upsertPlan = async (
  currentState: PlatformState,
  formData: FormData
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const parsed = planSchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      priceMonthly: formData.get("priceMonthly"),
      maxStudents: formData.get("maxStudents") ?? "",
      active: formData.get("active") === "on",
    });
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }
    const { id, ...data } = parsed.data;
    if (id) {
      // W10 — valeurs avant modification (before/after du journal)
      const before = await prisma.subscriptionPlan.findUnique({
        where: { id },
        select: { name: true, priceMonthly: true, maxStudents: true, active: true },
      });
      await prisma.subscriptionPlan.update({ where: { id }, data });
      await auditWithSession(session, "plan.update", `SubscriptionPlan#${id}`, {
        before: before ?? undefined,
        after: data,
        schoolId: null, // action plateforme pure
      });
    } else {
      const created = await prisma.subscriptionPlan.create({ data });
      await auditWithSession(session, "plan.create", `SubscriptionPlan#${created.id}`, {
        after: data,
        schoolId: null,
      });
    }
    revalidatePath("/platform/plans");
    return { success: true, error: false, message: id ? "Plan mis à jour." : "Plan créé." };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: true, message: "Un plan porte déjà ce nom." };
    }
    console.error("upsertPlan:", error);
    return { success: false, error: true, message: "Enregistrement impossible." };
  }
};

/** Attribue un plan à une école : nouvel abonnement = essai gratuit 30 jours. */
export const assignPlan = async (
  schoolId: number,
  planId: number
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, active: true },
    });
    if (!plan) {
      return { success: false, error: true, message: "Plan introuvable ou coupé." };
    }
    const existing = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
      include: { plan: { select: { name: true } } },
    });
    if (existing) {
      // changement de plan : les dates (essai/couverture) sont conservées
      await prisma.schoolSubscription.update({
        where: { schoolId },
        data: { planId },
      });
    } else {
      await prisma.schoolSubscription.create({
        data: {
          schoolId,
          planId,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      });
    }

    // W10 — journal d'audit : attribution/changement de plan (§2.11.2),
    // journalisé avec le schoolId de l'école CIBLE (§2.11.5).
    await auditWithSession(session, "subscription.assignPlan", `SchoolSubscription#school-${schoolId}`, {
      before: existing ? { planId: existing.planId, plan: existing.plan.name } : undefined,
      after: { planId, plan: plan.name, nouveau: !existing },
      schoolId,
    });

    revalidatePath("/platform");
    return { success: true, error: false, message: `Plan « ${plan.name} » attribué.` };
  } catch (error) {
    console.error("assignPlan:", error);
    return { success: false, error: true, message: "Attribution impossible." };
  }
};

/* ------------------------------------------------------------------ */
/* W06 — Memberships : rattacher un compte existant à une école         */
/* ------------------------------------------------------------------ */

const membershipSchema = z.object({
  schoolId: z.coerce.number().int(),
  email: z.string().email("Adresse e-mail invalide."),
  role: z.enum(SPACE_ROLES, {
    errorMap: () => ({ message: "Rôle invalide." }),
  }),
});

/**
 * Rattache un compte EXISTANT (par e-mail) à une école avec un rôle :
 * crée la membership, ou la réactive si elle existait désactivée.
 * L'utilisateur verra le nouvel espace à sa prochaine connexion (ou via la
 * bascule du header s'il est déjà connecté).
 */
export const addSchoolMembership = async (
  currentState: PlatformState,
  formData: FormData
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const parsed = membershipSchema.safeParse({
      schoolId: formData.get("schoolId"),
      email: formData.get("email"),
      role: formData.get("role"),
    });
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }
    const { schoolId, email, role } = parsed.data;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      return { success: false, error: true, message: "École introuvable." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!user) {
      return {
        success: false,
        error: true,
        message:
          "Aucun compte n'existe avec cette adresse e-mail — créez d'abord le compte.",
      };
    }
    if (user.role === "superadmin") {
      return {
        success: false,
        error: true,
        message: "Le superadmin est un rôle global : pas de membership.",
      };
    }

    await ensureMembership(user.id, schoolId, role);

    // W10 — journal d'audit : rattachement d'un compte à une école (§2.11.2
    // « changement de rôle »), journalisé avec le schoolId CIBLE (§2.11.5).
    await auditWithSession(session, "membership.create", `User#${user.id}`, {
      after: { email, role, school: school.name },
      schoolId,
    });

    revalidatePath(`/platform/schools/${schoolId}/members`);
    return {
      success: true,
      error: false,
      message: `${email} rattaché à « ${school.name} » comme ${SPACE_ROLE_LABELS[role] ?? role}.`,
    };
  } catch (error) {
    console.error("addSchoolMembership:", error);
    return { success: false, error: true, message: "Rattachement impossible." };
  }
};

/** Active / désactive une membership (une membership inactive n'est plus sélectionnable). */
export const toggleSchoolMembership = async (
  membershipId: number,
  active: boolean
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const membership = await prisma.userSchoolMembership.update({
      where: { id: membershipId },
      data: { active },
    });

    // W10 — journal d'audit : (dés)activation d'un rattachement (§2.11.2),
    // journalisée avec le schoolId de l'école CIBLE (§2.11.5).
    await auditWithSession(
      session,
      "membership.toggle",
      `UserSchoolMembership#${membershipId}`,
      {
        before: { active: !active },
        after: { active, userId: membership.userId, role: membership.role },
        schoolId: membership.schoolId,
      }
    );

    revalidatePath(`/platform/schools/${membership.schoolId}/members`);
    return {
      success: true,
      error: false,
      message: active ? "Rattachement réactivé." : "Rattachement désactivé.",
    };
  } catch (error) {
    console.error("toggleSchoolMembership:", error);
    return { success: false, error: true, message: "Opération impossible." };
  }
};

const paymentSchema = z.object({
  subscriptionId: z.coerce.number().int(),
  months: z.coerce.number().int().min(1, "Au moins 1 mois.").max(24, "24 mois maximum."),
  amount: z.coerce.number().int().min(0, "Montant invalide."),
  method: z.string().min(1, "Méthode requise."),
  reference: z.string().optional(),
  note: z.string().optional(),
});

/**
 * Enregistre un paiement manuel : couverture prolongée de N mois à partir
 * de maintenant ou de la fin de couverture actuelle (le plus tard des deux),
 * puis statut recalculé (→ ACTIVE).
 */
export const recordSubscriptionPayment = async (
  currentState: PlatformState,
  formData: FormData
): Promise<PlatformState> => {
  try {
    const session = await requireRole(["superadmin"]);
    const parsed = paymentSchema.safeParse({
      subscriptionId: formData.get("subscriptionId"),
      months: formData.get("months"),
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }
    const { subscriptionId, months, amount, method, reference, note } = parsed.data;

    const sub = await prisma.schoolSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) {
      return { success: false, error: true, message: "Abonnement introuvable." };
    }

    const now = new Date();
    const base = sub.paidUntil && sub.paidUntil > now ? sub.paidUntil : now;
    const paidUntil = new Date(base);
    paidUntil.setMonth(paidUntil.getMonth() + months);

    const [createdPayment] = await prisma.$transaction([
      prisma.subscriptionPayment.create({
        data: { subscriptionId, amount, months, method, reference, note },
      }),
      prisma.schoolSubscription.update({
        where: { id: subscriptionId },
        data: { paidUntil, status: "ACTIVE" },
      }),
    ]);

    // W10 — journal d'audit : paiement d'abonnement (§2.11.2), journalisé
    // avec le schoolId de l'école CIBLE (§2.11.5).
    await auditWithSession(
      session,
      "subscription.recordPayment",
      `SubscriptionPayment#${createdPayment.id}`,
      {
        before: { paidUntil: sub.paidUntil, status: sub.status },
        after: { amount, months, method, paidUntil, status: "ACTIVE" },
        schoolId: sub.schoolId,
      }
    );

    revalidatePath("/platform");
    return {
      success: true,
      error: false,
      message: `Paiement enregistré — couvert jusqu'au ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(paidUntil)}.`,
    };
  } catch (error) {
    console.error("recordSubscriptionPayment:", error);
    return { success: false, error: true, message: "Enregistrement impossible." };
  }
};
