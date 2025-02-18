"use server";

import { Prisma } from "@prisma/client";
import { ResultSchema } from "../formsValidationSchema";
import prisma from "../prisma";

interface ActionResult {
  success: boolean;
  error: boolean;
  message: string;
}

export const createResult = async (
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
        message: `L'étudiant avec le nom d'utilisateur "${data.studentUsername}" n'existe pas`,
      };
    }

    // Vérifier si un résultat existe déjà
    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: student.id,
        subjectId: data.subjectId,
        semesterId: data.semesterId,
      },
    });

    if (existingResult) {
      return {
        success: false,
        error: true,
        message: `Une note existe déjà pour cet étudiant dans cette matière pour ce semestre`,
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
    console.log("Erreur détaillée:", err);
    return {
      success: false,
      error: true,
      message: "Erreur lors de la création des notes",
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
