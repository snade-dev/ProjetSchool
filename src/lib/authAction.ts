"use server";

import { toast } from "react-toastify";
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
      }
    });
    console.log(response);

    
  } catch (error) {
    console.error(error);
    // return { error: "Invalid email or password" };
  }
  redirect("/admin");
}
