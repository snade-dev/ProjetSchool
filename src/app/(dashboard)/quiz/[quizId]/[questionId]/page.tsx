import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import TextForm from "./_components/TextForm";


const QuestionPage = async ({
  params,
}: {
  params: {
    quizId: string;
    questionId: string;
  };
}) => {
  const { quizId, questionId } = await params;

  const question = await prisma.question.findUnique({
    where: {
      id: questionId,
      quizId: quizId,
    },
  });

  if (!question) {
    return redirect("/");
  }

  return (
    <div className="p-6">
      <div className=" flex justify-center items-center">
        <div className=" w-full">
          <Link
            href={`/quiz/`}
            className=" flex items-center text-sm transition hover:opacity-75"
          >
            {/* <ArrowLeft className=" h-4 w-4 mr-2" /> */}
            Retour au cour
          </Link>
        </div>
      </div>

      <TextForm data={question}  />

    </div>
  );
};

export default QuestionPage;
