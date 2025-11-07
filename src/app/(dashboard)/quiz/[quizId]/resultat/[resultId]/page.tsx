import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Result } from "./components/ResultPrint";
import Link from "next/link";
import ResultPdfButton from "@/components/ResultPdfButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const page = async (props: {
  params: Promise<{ quizId: string; resultId: string }>;
}) => {
  const params = await props.params;
  const { resultId, quizId } = params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;

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
    include: {
      student: {
        select: {
          name: true,
          surname: true,
        },
      },
    },
  });

  const ExistingComplain = await prisma.complaint.findFirst({
    where: {
      quizId: quizId,
      studentId: resultId,
    },
  });

  if (!questionsWithAnswers || !result) {
    return notFound();
  }

  return (
    <>
      <Result questions={questionsWithAnswers} score={result.totalScore} />
      <div className=" flex items-center  gap-4 mt-4">
        <ResultPdfButton
          studentName={result.student.name}
          studentSurName={result.student.surname}
          questionsWithAnswers={questionsWithAnswers}
          totalScore={result.totalScore}
          quizId={quizId}
        />
        {ExistingComplain
          ? role === "student" && (
              <p className=" bg-white p-4 mt-4 font-bold">
                Vous avez deja fait une reclamation
              </p>
            )
          : role === "student" && (
              <Link href={`/quiz/${quizId}/reclamation/${resultId}`}>
                <button
                  className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer mt-1 w-[250px]"
                  type="submit"
                >
                  <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
                    Faire une reclamation
                  </span>
                </button>
              </Link>
            )}
      </div>
    </>
  );
};
export default page;
