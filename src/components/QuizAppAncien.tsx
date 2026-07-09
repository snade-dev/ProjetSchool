"use client";

import { useEffect, useState } from "react";
import { Quiz, Question } from "@/app/generated/prisma";
import { getQuiz } from "@/lib/actions/getQuizAction";

type QuizAppProps = {
  chapterId: string;
};

export const QuizApp = ({ chapterId }: QuizAppProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [dataQuiz, setDataQuiz] = useState<
    | (Quiz & {
        questions: (Question & {
          answerOptions?: { answerText: string; isCorrect: boolean }[];
        })[];
      })
    | null
  >(null);

  useEffect(() => {
    const getQuizzis = async () => {
      const q = await getQuiz(chapterId);
      return q;
    };

    getQuizzis().then((data) => {
      setDataQuiz(data);
    });
  }, [chapterId]);

  const handleAnswerButtonClick = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore(score + 1);
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < (dataQuiz?.questions.length ?? 0)) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
    }
  };

  const Repeat = () => {
    setShowScore(false);
    setCurrentQuestion(0);
    setScore(0);
  };

  return (
    <div className=" p-4">
      {/* HINT: replace "false" with logic to display the 
      score when the user has answered all the questions */}
      {showScore ? (
        <div className="">
          {score < (dataQuiz?.questions.length ?? 0) ? (
            <p>
              Ton score est de {score} sur {dataQuiz?.questions.length}
            </p>
          ) : (
            <p>
              Bravos ✅✅✅✅✅ Ton score est de {score} sur{" "}
              {dataQuiz?.questions.length}
            </p>
          )}

          <button onClick={Repeat}>Reprendre le quiz</button>
        </div>
      ) : (
        <>
          <div className="question-section">
            <h2 className=" text-2xl font-bold">Completer le quiz:</h2>
            <div className=" text-2xl ">
              <span>Question {currentQuestion + 1}</span> sur{" "}
              {dataQuiz?.questions.length}
            </div>
            <div className=" text-xl text-slate-500">
              {dataQuiz?.questions[currentQuestion].questionText}
            </div>
          </div>
          <div className=" mt-1 flex gap-1">
            {(dataQuiz?.questions[currentQuestion]?.answerOptions ?? []).map(
              (answerOption) => (
                <button
                  onClick={() =>
                    handleAnswerButtonClick(answerOption.isCorrect)
                  }
                  key={answerOption.answerText}
                >
                  {answerOption.answerText}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
};
