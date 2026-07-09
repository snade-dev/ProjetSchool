import prisma from "@/lib/prisma";
import { StudentAnswer } from "./components/StudentAnswer";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const page = async (props: { params: Promise<{ quizId: string }> }) => {
  const params = await props.params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const quiz = await prisma.quiz.findUnique({
    where: {
      id: params.quizId,
    },
    include: {
      questions: true,
    },
  });

  if (!quiz || !userId || !role) {
    return notFound();
  }

  return (
    <div>
      <StudentAnswer
        quizId={quiz.id}
        questions={quiz.questions}
        studentId={userId}
        role={role}
        duration={quiz.duration}
      />
    </div>
  );
};
export default page;
