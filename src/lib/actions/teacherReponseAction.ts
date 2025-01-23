"use server";

import prisma from "../prisma";
type CurrentState = {
    success: boolean;
    error: boolean;
    message: string;
  };

export async function teacherReponseAction(currentState: CurrentState,answers: Array<{
  studentId: string;
  quizId: string;
  questionId: string;
  score: number;
}>) {
  try {
    // Mettre à jour chaque réponse avec le score attribué
    for (const answer of answers) {
      await prisma.studentAnswer.updateMany({
        where: {
          studentId: answer.studentId,
          quizId: answer.quizId,
          questionId: answer.questionId,
        },
        data: {
          score: answer.score, // Mettre à jour le score
        },
      });
    }

    const totalScore = answers.reduce((acc, answer) => acc + answer.score, 0);
    
     // Vérifier si un quizResult existe déjà
     const existingQuizResult = await prisma.quizResult.findUnique({
      where: {
        studentId_quizId: {
          studentId: answers[0].studentId,
          quizId: answers[0].quizId,
        },
      },
    });
    
    if (existingQuizResult) {
      // Mettre à jour le quizResult existant
      await prisma.quizResult.update({
        where: {
          id: existingQuizResult.id,
        },
        data: {
          totalScore: totalScore,
        },
      });
    } else {
      // Créer un nouveau quizResult
      await prisma.quizResult.create({
        data: {
          studentId: answers[0].studentId,
          quizId: answers[0].quizId,
          totalScore: totalScore,
        },
      });
    }

    return { success: true, error: false, message: "Notes enregistrées avec succès" };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des notes :", error);
    return { success: false, error: true, message: "Erreur lors de l'enregistrement des notes" };
  }
}