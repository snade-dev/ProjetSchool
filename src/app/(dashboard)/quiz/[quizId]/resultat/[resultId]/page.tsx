import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Result } from "./components/ResultPrint";

const page = async ({ params }: { params: {quizId: string, resultId: string } }) => {
  const { resultId,quizId } = params;
  
  const questionsWithAnswers = await prisma.question.findMany({
    where: {
      quizId: quizId, // Filtrer par ID du quiz
    },
    include: {
      StudentAnswer: {
        where: {
          studentId: resultId, // Filtrer par ID de l'étudiant
        },
      },
    },
  });

  const result = await prisma.quizResult.findUnique({
    where: {
      studentId_quizId: { studentId: resultId, quizId: quizId },
    },
  });

  if (!questionsWithAnswers || !result) {
    return notFound();
  }  

  return <Result questions={questionsWithAnswers} score={result.totalScore} />;
};
export default page;
