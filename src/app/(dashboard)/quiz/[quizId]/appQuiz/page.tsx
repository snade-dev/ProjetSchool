import prisma from "@/lib/prisma"
import { StudentAnswer } from "./components/StudentAnswer"
import { notFound } from "next/navigation"
import { auth, currentUser } from '@clerk/nextjs/server';

const page = async (props: {params: Promise<{quizId: string}>}) => {
  const params = await props.params;

  const { userId, sessionClaims} = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;


  const quiz =await prisma.quiz.findUnique({
   where: {
     id: params.quizId
   },
   include: {
     questions: true
   }
 })

  if (!quiz || !userId || !role) {
    return notFound();
  }

  return (
    <div>
      <StudentAnswer quizId={quiz.id} questions={quiz.questions} studentId={userId} role={role} duration={quiz.duration} />
    </div>
  )
}
export default page