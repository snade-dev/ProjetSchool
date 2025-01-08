"use server";

import prisma from "@/lib/prisma";

export async function updateQuizScore(quizId: string, score: number) {
  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { score },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du score:", error);
    throw new Error("Impossible de mettre à jour le score");
  }
}
