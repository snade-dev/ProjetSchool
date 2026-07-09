"use server";

import { SemesterSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

// SEMESTER
export const createSemester = async (
  currentState: CurrentState,
  data: SemesterSchema
) => {
  try {
    await requireRole(["admin"]);
    console.log("🟡 createSemester appelé avec :", data);

    const existingSemester = await prisma.semester.findFirst({
      where: { name: data.name },
    });

    if (existingSemester) {
      console.log("🔴 Semestre déjà existant :", existingSemester);
      return {
        success: false,
        error: true,
        message: "Le semestre existe déjà",
      };
    }

    await prisma.semester.create({
      data: {
        name: data.name,
        subjects: {
          connect: data.subjects.map((id) => ({ id: Number(id) })), // Vérifier le type ici
        },
      },
    });

    console.log("✅ Semestre créé avec succès !");
    revalidatePath("/list/semester");
    return {
      success: true,
      error: false,
      message: "Semestre créé avec succès",
    };
  } catch (error) {
    console.error("❌ Erreur Prisma :", error);
    return { success: false, error: true, message: `Erreur serveur: ${error}` };
  }
};


export const updateSemester = async (
  currentState: CurrentState2,
  data: SemesterSchema
) => {
  try {
    await requireRole(["admin"]);
    await prisma.semester.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        subjects: {
          set: data.subjects.map((id) => ({ id })), // Remplace les matières
        },
      },
    });

    revalidatePath("/list/semester");
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

export const deleteSemester = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await requireRole(["admin"]);
    await prisma.semester.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/semester");
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true };
  }
};
