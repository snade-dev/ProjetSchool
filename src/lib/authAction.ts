"use server";

import { auth } from "./auth";
import { redirect } from "next/navigation";
import prisma from "./prisma";

/** Rôles ayant un tableau de bord ; tout autre rôle (dont "user") n'a pas d'accès. */
const DASHBOARD_ROLES = ["admin", "teacher", "student", "parent"];

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
      select: { role: true },
    });
    role = dbUser?.role ?? "";
  } catch (error) {
    console.error("Erreur de connexion Better Auth:", error);
    redirect("/sign-in?error=invalid-credentials");
  }

  // Redirection selon le rôle réel (hors du try : redirect() lève NEXT_REDIRECT).
  // Un rôle inconnu ("user", "") n'a pas de dashboard → message explicite.
  if (!role || !DASHBOARD_ROLES.includes(role)) {
    redirect("/sign-in?error=no-role");
  }

  redirect(`/${role}`);
}
