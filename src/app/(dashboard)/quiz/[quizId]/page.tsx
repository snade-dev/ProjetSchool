import prisma from "@/lib/prisma";
import { Question, Quiz } from "@prisma/client";
import QuizForm from "./components/QuizForm";
import Link from "next/link";

const QuestionPage = async ({params}: {params: {quizId: string}}) => {
  const {quizId} = await params;
  const data: Question[] =
    await prisma.question.findMany({
      where: {
        quizId: quizId
      },
      select: {
        id: true,
        questionText: true,
        quizId: true
      },
    });


  const subject = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className=" bg-white p-6 m-4 mt-0 rounded-lg shadow-md">
      <h1 className=" font-bold text-2xl">Créer une question</h1>

      <QuizForm quizId={quizId} />
      <div className=" text-xl font-bold">Liste des devoirs</div>
      {data.length === 0 ? (
        "pas de quiz"
      ) : (
        <div>
          {data.map((question) => (
            <div
              key={question.id}
              className="mb-3 p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200 my-2 mr-2"
            >
                <Link href={`/quiz/${quizId}/${question.id}`}>
                  <p>{question.questionText}</p>
                </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default QuestionPage;
