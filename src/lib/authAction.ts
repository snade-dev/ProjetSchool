"use server";

import { auth } from "./auth";
import { redirect } from "next/navigation";

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

    redirect("/admin");
  } catch (error) {
    console.error("Erreur de connexion Better Auth:", error);
    redirect("/sign-in?error=invalid-credentials");
  }
}
