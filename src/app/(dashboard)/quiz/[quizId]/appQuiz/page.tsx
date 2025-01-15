import prisma from "@/lib/prisma"
import { StudentAnswer } from "./components/StudentAnswer"
import { notFound } from "next/navigation"
import { auth, currentUser } from '@clerk/nextjs/server';

const page = async ({params}: {params: {quizId: string}}) => {
  
  const { userId} = await auth();


   const quiz =await prisma.quiz.findUnique({
    where: {
      id: params.quizId
    },
    include: {
      questions: true
    }
  })

  if (!quiz || !userId) {
    return notFound();
  }

  return (
    <div>
      <StudentAnswer quizId={quiz.id} questions={quiz.questions} studentId={userId} />
    </div>
  )
}
export default page