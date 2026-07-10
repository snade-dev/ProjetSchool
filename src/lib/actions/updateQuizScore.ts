"use server";

import prisma from "@/lib/prisma";

export async function updateQuizScore(quizId: string, score: number) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new Error("Quiz introuvable");
    }

    return { quizId, score };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du score:", error);
    throw new Error("Impossible de mettre à jour le score");
  }
}
