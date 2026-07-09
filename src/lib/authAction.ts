"use server";

import { auth } from "./auth";
import { redirect } from "next/navigation";
import prisma from "./prisma";

export async function signUp(formData: FormData) {
  const name = formData.get("name")?.toString() || "";
  const email = formData.get("email")?.toString() || "";
  const password = formData.get("password")?.toString() || "";
 
  try {
    const response = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      }
    });
    console.log(response);
    
  } catch (error) {
    console.error(error);
    // return { error: "Invalid email or password" };
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email")?.toString() || "";
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
    // réponse — cf. better-auth sign-in/email) : on lit le rôle en base.
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });
    role = dbUser?.role ?? "";
  } catch (error) {
    console.error("Erreur de connexion Better Auth:", error);
    redirect("/sign-in?error=invalid-credentials");
  }

  // Redirection selon le rôle réel (hors du try : redirect() lève NEXT_REDIRECT)
  if (!role) {
    redirect("/sign-in?error=no-role");
  }

  redirect(`/${role}`);
}
