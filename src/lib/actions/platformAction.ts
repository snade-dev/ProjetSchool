"use server";

import { z } from "zod";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { createAuthUser, removeAuthUser } from "../authAdmin";
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
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Crée une école + son premier compte admin (compensation si le compte échoue). */
export const createSchool = async (
  currentState: PlatformState,
  formData: FormData
): Promise<PlatformState> => {
  try {
    await requireRole(["superadmin"]);

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
      // createAuthUser n'a donc rien posé automatiquement)
      await prisma.user.update({
        where: { id: adminId },
        data: { schoolId: school.id },
      });
    } catch (err) {
      await removeAuthUser(adminId);
      await prisma.school.delete({ where: { id: school.id } });
      throw err;
    }

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
    await requireRole(["superadmin"]);
    await prisma.school.update({
      where: { id: schoolId },
      data: { active },
    });
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
