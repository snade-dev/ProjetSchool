import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Correct } from "./components/CorrectionForm";

const page = async ({ params }: { params: {quizId: string, answerId: string } }) => {
  const { answerId,quizId } = params;
//   console.log("answerId", answerId);
//   console.log("quizId", quizId);


  
  const questionsWithAnswers = await prisma.question.findMany({
    where: {
      quizId: quizId, // Filtrer par ID du quiz
    },
    include: {
      StudentAnswer: {
        where: {
          studentId: answerId, // Filtrer par ID de l'étudiant
        },
      },
    },
  });

  if (!questionsWithAnswers) {
    return notFound();
  }  

  return <Correct questions={questionsWithAnswers} quizId={quizId} studentId={answerId} />;
};
export default page;
