"use server";

import { ResultFormSchema, ResultMSchema, ResultSchema } from "../formsValidationSchema";
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

interface ActionResult {
  success: boolean;
  error: boolean;
  message: string;
}

export const createResult = async (
  currentState: ActionResult,
  data: ResultSchema
): Promise<ActionResult> => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    const student = await prisma.student.findUnique({
      where: { username: data.studentUsername },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        message: "L'étudiant n'existe pas",
      };
    }

    const result = await prisma.result.findUnique({
      where: {
        examId_studentId_subjectId: {
          studentId: student.id,
          examId: data.examId,
          subjectId: data.subjectId,
        },
      },
    });

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
        examId: data.examId,
        studentId: student.id,
        semesterId: data.semesterId,
      },
    });

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
    

  // Mise à jour en transaction de tous les résultats
  await prisma.$transaction(
    resultsData.results.map(({ id, score }) =>
      prisma.result.update({
        where: { id },
        data: { score },
      })
    )
  );

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

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.result.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
