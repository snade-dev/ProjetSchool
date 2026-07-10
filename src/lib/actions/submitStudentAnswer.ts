"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/authGuard";
import { revalidatePath } from "next/cache";



type CurrentState = {
  success: boolean;
  error: boolean;
  message: string;
};

const answerSchema = z.object({
  studentId: z.string(),
  quizId: z.string(),
  questionId: z.string(),
  answerText: z.string().min(1, 'Answer cannot be empty').max(500, 'Answer is too long'),
});

export async function submitStudentAnswers(
  currentState: CurrentState,
  answers: z.infer<typeof answerSchema>[]
) {
  try {
     const { userId, role } = await requireRole(["admin", "student"]);

     // Valider les réponses avec Zod
     const validatedAnswers = answers.map((answer) => answerSchema.parse(answer));

     if (role === "student" && validatedAnswers.some((a) => a.studentId !== userId)) {
       return { success: false, error: true, message: "Accès refusé" };
     }

     // Insérer les réponses dans la base de données
     const result = await prisma.studentAnswer.createMany({
       data: validatedAnswers,
     });

    revalidatePath("/list/onlineExam");
    return { success: true,error: false , message: "Réponses enregistrées avec succès !" };
  } catch (error) {
    console.error("Erreur lors de l'envoi :", error);
    return { success: false,error: true, message: "Erreur lors de l'enregistrement." };
  }
}
