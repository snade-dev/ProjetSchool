"use server";

import prisma from "../prisma";



export const getQuiz = async (quizId: string) => {
    try {
        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizId
            },
            include: {
                questions: {
                    
                }
            }
        })

        if (!quiz) {
            throw new Error('Aucun quiz')
        }
    
        return quiz;
    } catch (error) {
        console.log("GET QUIZ ERROR: ", error);
        return null;
    }
}