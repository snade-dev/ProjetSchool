"use server";

import prisma from "../prisma";
import { requireRole } from "../authGuard";
import { revalidatePath } from "next/cache";

type CurrentState = {
  success: boolean;
  error: boolean;
  message: string;
};

export async function teacherReponseAction(
  currentState: CurrentState,
  answers: Array<{
    studentId: string;
    quizId: string;
    questionId: string;
    score: number;
  }>
) {
  console.log("Début de teacherReponseAction");
  console.log("Réponses reçues :", JSON.stringify(answers, null, 2));

  try {
    await requireRole(["admin", "teacher"]);
    // Logique de mise à jour des réponses
    console.log(`Début de la mise à jour de ${answers.length} réponses`);
    for (const [index, answer] of answers.entries()) {
      console.log(`Traitement réponse ${index + 1}/${answers.length} :`, {
        studentId: answer.studentId,
        quizId: answer.quizId,
        questionId: answer.questionId,
        score: answer.score
      });

      const updateResult = await prisma.studentAnswer.updateMany({
        where: {
          studentId: answer.studentId,
          quizId: answer.quizId,
          questionId: answer.questionId,
        },
        data: { score: answer.score },
      });

      console.log(`Réponse ${index + 1} mise à jour :`, {
        count: updateResult.count,
        studentId: answer.studentId
      });
    }

    // Calcul du score total
    const totalScore = answers.length
      ? answers.reduce((acc, answer) => acc + answer.score, 0) / answers.length
      : 0;
    console.log("Score moyen calculé :", totalScore);

    // Gestion du quizResult
    const studentId = answers[0]?.studentId;
    const quizId = answers[0]?.quizId;
    
    if (!studentId || !quizId) {
      console.error("Données manquantes dans les réponses");
      throw new Error("Données de studentId ou quizId manquantes");
    }

    console.log("Recherche du quizResult existant...", { studentId, quizId });
    const existingQuizResult = await prisma.quizResult.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
    });

    if (existingQuizResult) {
      console.log("QuizResult existant trouvé :", existingQuizResult.id);
      console.log("Mise à jour du quizResult...");
      
      const updatedResult = await prisma.quizResult.update({
        where: { id: existingQuizResult.id },
        data: { totalScore },
      });

      console.log("QuizResult mis à jour :", {
        newScore: updatedResult.totalScore,
        previousScore: existingQuizResult.totalScore
      });
    } else {
      console.log("Aucun quizResult existant, création d'un nouveau...");
      const newResult = await prisma.quizResult.create({
        data: { studentId, quizId, totalScore },
      });
      console.log("Nouveau quizResult créé :", newResult.id);
    }

    console.log("Opération terminée avec succès");
    revalidatePath("/list/resultExam");
    return {
      success: true,
      error: false,
      message: "Notes enregistrées avec succès"
    };

  } catch (error) {
    console.error("Erreur dans teacherReponseAction :");
    console.error("Type d'erreur :", error instanceof Error ? error.constructor.name : "Inconnu");
    console.error("Message d'erreur :", error instanceof Error ? error.message : "Pas de message");
    console.error("Stack trace :", error instanceof Error ? error.stack : "Pas de stack trace");
    
    return { 
      success: false, 
      error: true, 
      message: `Erreur lors de l'enregistrement: ${error instanceof Error ? error.message : "Erreur inconnue"}`
    };
  } finally {
    console.log("Fin de l'exécution de teacherReponseAction");
  }
}