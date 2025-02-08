import { Prisma } from "@prisma/client";

type QuestionWithAnswers = Prisma.QuestionGetPayload<{
  include: {
    StudentAnswer: true;
  };
}>;

type ResultProps = {
  questions: QuestionWithAnswers[];
  score: number
};

export const Result = ({ questions, score }: ResultProps) => {


  return (
    <div className="p-8 min-w-[500px] mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6">La copie corriger :</h2>
        <div className="space-y-6">
          {questions.map((question: QuestionWithAnswers, index: number) => (
            <div key={question.id} className=" flex flex-col">
              <p className=" font-bold">Question {index + 1}:</p>
              <div className="flex-col items-center justify-between gap-4">
                <label>{question.questionText}</label>
                <div className=" flex justify-between gap-4">
                  <input
                  type="text"
                    defaultValue={
                      question.StudentAnswer.length !== 0
                        ? question.StudentAnswer[0].answerText
                        : "pas de reponse"
                    }
                    className="border border-gray-300 p-2 rounded-lg"
                    disabled
                  />
                  <div className=" bg-slate-100 py-2 px-4 rounded-lg">
                    {question.StudentAnswer[0].score
                      ? question.StudentAnswer[0].score
                      : 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className=" font-bold p-4 bg-slate-200 rounded-md">Note total: {score}</p>
        </div>
    </div>
  );
};
