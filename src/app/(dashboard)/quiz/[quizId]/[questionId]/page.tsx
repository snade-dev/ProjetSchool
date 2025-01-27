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
      {/* <QuestionForm data={question} /> */}
      {/* <div className="mb-3 p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200 my-2 mr-2">
        <p>{question.questionText}</p>
      </div> */}
      <TextForm data={question}  />

    </div>
  );
};

export default QuestionPage;
