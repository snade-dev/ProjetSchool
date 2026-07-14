"use server";

import { auth } from "./auth";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { getSelectableMemberships } from "./membership";

/** Rôles ayant un tableau de bord ; tout autre rôle (dont "user") n'a pas d'accès. */
const DASHBOARD_ROLES = [
  "admin",
  "director",
  "teacher",
  "accountant",
  "supervisor",
  "student",
  "parent",
  "superadmin",
];

export async function signUp(formData: FormData) {
  const name = formData.get("name")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";

  // Validations serveur (les redirect() restent HORS des try/catch : NEXT_REDIRECT).
  if (!name || !email || !password) {
    redirect("/sign-up?error=missing-fields");
  }
  if (password.length < 8) {
    redirect("/sign-up?error=password-too-short");
  }
  if (password !== confirmPassword) {
    redirect("/sign-up?error=password-mismatch");
  }

  let errorCode: string | null = null;
  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });
  } catch (error) {
    console.error("Erreur d'inscription Better Auth:", error);
    const code = (error as { body?: { code?: string } })?.body?.code;
    errorCode = code === "USER_ALREADY_EXISTS" ? "email-exists" : "unknown";
  }

  if (errorCode) {
    redirect(`/sign-up?error=${errorCode}`);
  }

  // Compte créé : le rôle par défaut n'ouvre aucun tableau de bord (attribution
  // par l'administration) → retour à la connexion avec message de succès.
  redirect("/sign-in?success=account-created");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";

  let role = "";
  // W06 — cible calculée depuis les memberships (sélecteur d'espace §2.7.10)
  let membershipTarget: string | null = null;
  try {
    const response = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!response) {
      throw new Error("Identifiants invalides.");
    }

    // `signInEmail` ne renvoie PAS les champs de plugin (role absent de la
    // réponse — cf. better-auth sign-in/email) : on lit le rôle en base (H40).
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, schoolId: true },
    });
    role = dbUser?.role ?? "";

    // W06 — la vérité des rattachements est UserSchoolMembership (le
    // superadmin, rôle global, n'en a pas) :
    // - plusieurs espaces → écran de choix /select-space ;
    // - un seul → sélection silencieuse (contexte actif resynchronisé si besoin) ;
    // - aucun → comportement historique sur le rôle actif (compte sans espace).
    if (dbUser && role !== "superadmin") {
      const spaces = await getSelectableMemberships(dbUser.id);
      if (spaces.length > 1) {
        membershipTarget = "/select-space";
      } else if (spaces.length === 1) {
        const space = spaces[0];
        if (dbUser.schoolId !== space.schoolId || dbUser.role !== space.role) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { schoolId: space.schoolId, role: space.role },
          });
        }
        membershipTarget = `/${space.role}`;
      }
    }
  } catch (error) {
    console.error("Erreur de connexion Better Auth:", error);
    redirect("/sign-in?error=invalid-credentials");
  }

  // Redirections hors du try : redirect() lève NEXT_REDIRECT.
  if (membershipTarget) {
    redirect(membershipTarget);
  }

  // Aucune membership sélectionnable : redirection selon le rôle actif.
  // Un rôle inconnu ("user", "") n'a pas de dashboard → message explicite.
  if (!role || !DASHBOARD_ROLES.includes(role)) {
    redirect("/sign-in?error=no-role");
  }

  // V04 — le superadmin atterrit sur l'espace plateforme
  redirect(role === "superadmin" ? "/platform" : `/${role}`);
}
