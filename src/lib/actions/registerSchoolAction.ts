"use server";

import { redirect } from "next/navigation";
import { auth } from "../auth";
import prisma from "../prisma";
import { ensureMembership } from "../membership";

/**
 * V07 — Inscription self-service d'un établissement (page publique
 * /register-school) : compte admin + école + essai gratuit 30 jours sur le
 * plan actif le moins cher (école sans abonnement si aucun plan configuré —
 * jamais bloquée, cf. V06).
 *
 * Les redirect() restent HORS des try/catch (NEXT_REDIRECT), pattern
 * identique à authAction.signUp.
 */

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents (combining marks après NFD)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function registerSchool(formData: FormData) {
  const schoolName = formData.get("schoolName")?.toString().trim() || "";
  const name = formData.get("name")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";

  if (!schoolName || !name || !email || !password) {
    redirect("/register-school?error=missing-fields");
  }
  if (password.length < 8) {
    redirect("/register-school?error=password-too-short");
  }
  if (password !== confirmPassword) {
    redirect("/register-school?error=password-mismatch");
  }

  let errorCode: string | null = null;
  try {
    // 1. Compte de connexion (public, rôle « user » pour l'instant)
    let userId: string;
    try {
      const res = await auth.api.signUpEmail({
        body: { email, password, name },
      });
      userId = res.user.id;
    } catch (err: any) {
      const msg = `${err?.body?.message ?? err?.message ?? err}`;
      errorCode = /already exists|existing email/i.test(msg)
        ? "email-exists"
        : "unknown";
      throw err;
    }

    try {
      // 2. École (slug unique)
      const base = slugify(schoolName) || "ecole";
      let slug = base;
      for (let i = 2; await prisma.school.findUnique({ where: { slug } }); i++) {
        slug = `${base}-${i}`;
      }
      const school = await prisma.school.create({
        data: { name: schoolName, slug },
      });

      // 3. Promotion : le créateur devient l'admin de SON école — contexte
      // actif + membership (W06, vérité des rattachements) en transaction.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { role: "admin", schoolId: school.id },
        });
        await ensureMembership(userId, school.id, "admin", tx);
      });

      // 4. Essai gratuit 30 j sur le plan actif le moins cher (s'il existe)
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { active: true },
        orderBy: { priceMonthly: "asc" },
      });
      if (plan) {
        await prisma.schoolSubscription.create({
          data: {
            schoolId: school.id,
            planId: plan.id,
            status: "TRIAL",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        });
      }
    } catch (err) {
      // compensation : pas de compte orphelin si l'école n'a pas pu être créée
      await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
      errorCode = errorCode ?? "unknown";
      throw err;
    }
  } catch (error) {
    console.error("registerSchool:", error);
  }

  if (errorCode) {
    redirect(`/register-school?error=${errorCode}`);
  }

  redirect("/sign-in?success=school-created");
}
