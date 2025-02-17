"use server";

import { Prisma } from "@prisma/client";
import { ResultSchema } from "../formsValidationSchema";
import prisma from "../prisma";

interface ActionResult {
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

export const updateResult = async (
  prevState: ActionResult,
  data: ResultSchema
): Promise<ActionResult> => {
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

    await prisma.result.update({
      where: {
        id: data.id,
      },
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
      message: "Note modifiée avec succès",
    };
  } catch (err) {
    console.error("Erreur lors de la modification:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la modification de la note",
    };
  }
};

export const deleteResult = async (
  prevState: ActionResult,
  data: FormData
): Promise<ActionResult> => {
  try {
    const id = data.get("id");
    if (!id) {
      return {
        success: false,
        error: true,
        message: "ID de la note manquant",
      };
    }

    await prisma.result.delete({
      where: {
        id: parseInt(id as string),
      },
    });

    return {
      success: true,
      error: false,
      message: "Note supprimée avec succès",
    };
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la suppression de la note",
    };
  }
};
