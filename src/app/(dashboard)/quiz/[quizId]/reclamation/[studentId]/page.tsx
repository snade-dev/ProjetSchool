import ReclamationForm from "./components/ReclamationForm"

const ReclamationPage = async (props: { params: Promise<{ quizId: string,studentId: string }> }) => {
  const params = await props.params;
  return (
    <div>
        <p className=" pl-4 text-2xl font-bold italic">Vous voulez faire une reclamation?</p>
        <ReclamationForm quizId={params.quizId} studentId={params.studentId} />
    </div>
  )
}
export default ReclamationPage