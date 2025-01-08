import { QuizApp } from "./components/QuizApp"

const page = async ({params}: {params: {quizId: string}}) => {


  const {quizId}= await params;
  return (
    <div>
      <QuizApp quizId={quizId} />
    </div>
  )
}
export default page