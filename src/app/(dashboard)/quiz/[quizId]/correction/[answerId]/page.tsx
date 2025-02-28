import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Correct } from "./components/CorrectionForm";
import { auth } from "@clerk/nextjs/server";

const page = async (props: { params: Promise<{quizId: string, answerId: string }> }) => {
  const params = await props.params;
  const { answerId,quizId } = params;
  const { userId, sessionClaims} = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

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

  if (!questionsWithAnswers || !role) {
    return notFound();
  }

  return <Correct questions={questionsWithAnswers} quizId={quizId} studentId={answerId} role={role} />;
};
export default page;
