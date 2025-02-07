"use server";

import { SemesterSchema } from "../formsValidationSchema";
import prisma from "../prisma";

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
    const existingSemester = await prisma.semester.findFirst({
      where: {
        name: data.name,
      },
    });

    if (existingSemester) {
      return {
        success: false,
        error: true,
        message: "Le semestre existe déjà",
      };
    }

    await prisma.semester.create({
      data,
    });

    // revalidatePath("/list/semesters");
    return { success: true, error: false, message: "" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: `${error}` };
  }
};

export const updateSemester = async (
  currentState: CurrentState2,
  data: SemesterSchema
) => {
  try {
    await prisma.semester.update({
      where: {
        id: data.id,
      },
      data,
    });

    // revalidatePath("/list/semesters");
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
    await prisma.semester.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/semesters");
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true };
  }
};
