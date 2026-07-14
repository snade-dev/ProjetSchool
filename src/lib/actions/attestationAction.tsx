"use server";

import { AttestationSchema, QuizSchema } from "../formsValidationSchema";
import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";

type CurrentState = {
  success: boolean;
  error: boolean;
  message: string;
};
type CurrentState2 = {
  success: boolean;
  error: boolean;
};

export const createAttestation = async (
  currentState: CurrentState,
  data: {
    title: string;
    description: string;
    studentId: string;
  }
) => {
  try {
    const { userId, role } = await requireRole(["admin", "director", "student"]);

    if (role === "student" && data.studentId !== userId) {
      return { success: false, error: true, message: "Accès refusé" };
    }

    const quiz = await prisma.attestation.create({
      data: {
        title: data.title,
        description: data.description,
        studentId: data.studentId,
      },
    });

    revalidatePath("/list/demande");
    return { success: true, error: false, message: "Hello" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

export const updateAttestation = async (
  currentState: CurrentState,
  data: {
    title: string;
    description: string;
    studentId: string;
  }
) => {
  try {
    await requireRole(["admin", "director", "teacher"]);

    return { success: true, error: false, message: "Hello" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};
export const deleteQuiz = async (
  currentState: CurrentState2,
  data: FormData
) => {
  try {
    const { userId, role } = await requireRole(["admin", "director", "teacher"]);

    const id = data.get("id") as string;

    if (role === "teacher") {
      const owned = await prisma.quiz.findFirst({
        where: { id, teacherId: userId },
      });
      if (!owned) {
        return { success: false, error: true };
      }
    }

    const quiz = await prisma.quiz.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/onlineExam");
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true };
  }
};

export const createQuestion = async (
  currentState: CurrentState,
  data: {
    questionText: string;
    id?: string | undefined;
    quizId: string;
    createdBy: string;
  }
) => {
  try {
    const { userId, role } = await requireRole(["admin", "director", "teacher"]);

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: data.quizId,
      },
    });

    if (!quiz) {
      return {
        success: false,
        error: true,
        message: "Cet devoir n'existe pas",
      };
    }

    if (role === "teacher" && quiz.teacherId !== userId) {
      return { success: false, error: true, message: "Accès refusé" };
    }

    const question = await prisma.question.create({
      data: {
        createdBy: data.createdBy,
        quizId: data.quizId,
        questionText: data.questionText,
      },
    });

    revalidatePath("/list/onlineExam");
    return { success: true, error: false, message: "Hello" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};
export const updateQuestion = async (
  currentState: CurrentState,
  data: {
    questionText: string;
    id?: string | undefined;
    quizId: string;
    createdBy: string;
  }
) => {
  try {
    await requireRole(["admin", "director", "teacher"]);

    const quiz = await prisma.question.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!quiz) {
      return {
        success: false,
        error: true,
        message: "Cet devoir n'existe pas",
      };
    }

    const question = await prisma.question.update({
      where: {
        id: data.id,
      },

      data: {
        questionText: data.questionText,
      },
    });

    revalidatePath("/list/onlineExam");
    return { success: true, error: false, message: "Hello" };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: "" };
  }
};

// import { Prisma }from "@/app/generated/prisma"

// export const updateOption = async (
//   currentState: CurrentState,
//   data: {
//     answerText: string;
//     isCorrect: boolean;
//     questionId: string;
//     id?: string | undefined;
//   }
// ) => {
//   try {
//     console.log("Données reçues pour mise à jour:", data);

//     const quiz = await prisma.question.findUnique({
//       where: {
//         id: data.questionId,
//       },
//     });

//     if (!quiz) {
//       console.error("Question non trouvée avec l'ID:", data.questionId);
//       return {
//         success: false,
//         error: true,
//         message: "Cette question n'existe pas",
//       };
//     }

//     console.log("Question trouvée:", quiz);

//     const updatedOption = await prisma.answerOption.update({
//       where: {
//         id: data.id,
//       },
//       data: {
//         answerText: data.answerText,
//         isCorrect: data.isCorrect,
//         questionId: data.questionId,
//       },
//     });

//     console.log("Option mise à jour avec succès:", updatedOption);

//     return { success: true, error: false, message: "Mise à jour réussie" };
//   } catch (error) {
//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       console.error("Erreur Prisma:", error.message);
//     } else {
//       console.error("Erreur inconnue:", error);
//     }
//     return { success: false, error: true, message: "Erreur serveur" };
//   }
// };

// export const createOption = async (
//   currentState: CurrentState,
//   data: {
//     answerText: string;
//     isCorrect: boolean;
//     questionId: string;
//     id?: string | undefined;
//   }
// ) => {
//   try {
//     const quiz = await prisma.question.findUnique({
//       where: {
//         id: data.questionId,
//       },
//     });

//     if (!quiz) {
//       return {
//         success: false,
//         error: true,
//         message: "Cet devoir n'existe pas",
//       };
//     }

//     await prisma.answerOption.create({
//       data: {
//         answerText: data.answerText,
//         isCorrect: data.isCorrect,
//         questionId: data.questionId,
//       },
//     });

//     return { success: true, error: false, message: "Hello" };
//   } catch (error) {
//     console.log(error);
//     return { success: false, error: true, message: "" };
//   }
// };
