"use server";

import { ResultFormSchema, ResultMSchema, ResultSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";
import { deleteErrorMessage } from '../actionErrors';

type CurrentState = {
  success: boolean;
  error: boolean;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
  message: string;
};

interface ActionResult {
  success: boolean;
  error: boolean;
  message: string;
}

export const createResult = async (
  currentState: ActionResult,
  data: ResultSchema
): Promise<ActionResult> => {
  try {
    const { userId, role } = await requireRole(["admin", "teacher"]);

    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername },
    });

    console.log("Etudiant trouvé:", student);


    if (!student) {
      return {
        success: false,
        error: true,
        message: "L'étudiant n'existe pas",
      };
    }

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId,
          subjectId: data.subjectId,
          classId: student.classId,
        },
      });
      if (!teacherLesson) {
        return {
          success: false,
          error: true,
          message: "Vous ne pouvez noter que vos matières",
        };
      }
    }

    const result = await prisma.result.findUnique({
      where: {
        semesterId_studentId_subjectId: {
          studentId: student.id,
          semesterId: data.semesterId,      
          subjectId: data.subjectId,
        },
      },
    });

    console.log("Résultat trouvé:", result);
    

    if (result) {
      return {
        success: false,
        error: true,
        message: "Ce résultat existe déjà",
      };
    }

    await prisma.result.create({
      data: {
        subjectId: data.subjectId,
        score: data.score,
        classScore: data.classScore,
        studentId: student.id,
        semesterId: data.semesterId,
      },
    });

    console.log("Note enregistrée avec succès");

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return {
      success: true,
      error: false,
      message: "Note enregistrée avec succès",
    };
  } catch (err) {
    console.error("Erreur détaillée:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la création de la note",
    };
  }
};



export async function updateResults(currentState: CurrentState2, resultsData: ResultFormSchema) {
  // Validation des données
  try {
    await requireRole(["admin", "teacher"]);

  // Mise à jour en transaction de tous les résultats
  await prisma.$transaction(
    resultsData.results.map(({ id, score, classscore }) =>
      prisma.result.update({
        where: { id },
        data: { score, classScore:classscore },
      })
    )
  );

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return { success: true, error: false, message: "Notes mises à jour avec succès" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "Erreur lors de la mise à jour des notes" };
  }
}


export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await requireRole(["admin"]);
    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/results");
    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err: any) {
    console.log(err);
    return { success: false, error: true, message: deleteErrorMessage(err) };
  }
};
