"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Quiz, Question, AnswerOption } from "@prisma/client";
import { getQuiz } from "@/lib/actions/getQuizAction";
import { updateQuizScore } from "@/lib/actions/updateQuizScore";
import { useRouter } from "next/navigation";

type QuizAppProps = {
  quizId: string;
};

export const QuizApp = ({ quizId }: QuizAppProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // Temps initial (60 secondes)
  const [dataQuiz, setDataQuiz] = useState<
    | (Quiz & { questions: (Question & { answerOptions: AnswerOption[] })[] })
    | null
  >(null);

  const router = useRouter();

  useEffect(() => {
    const getQuizzis = async () => {
      const q = await getQuiz(quizId);
      setDataQuiz(q);
    };
    getQuizzis();
  }, [quizId]);

  // Gestion du temps avec useEffect
  useEffect(() => {
    if (timeLeft > 0 && !showScore) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !showScore) {
      setShowScore(true); // Le temps est écoulé, afficher le score
    }
  }, [timeLeft, showScore]);

  // Mise à jour du score lorsque le quiz est terminé
  useEffect(() => {
    async function update() {
      await updateQuizScore(quizId, score);
    }
    if (showScore) {
      update();
      router.refresh();
    }
  }, [showScore, score, quizId, router]);

  const handleAnswerButtonClick = (isCorrect: boolean) => {
    if (isCorrect) setScore(score + 1);
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < (dataQuiz?.questions.length ?? 0)) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
    }
  };

  const Redirect = () => {
    router.push("/list/onlineExam")
    // setShowScore(false);
    // setCurrentQuestion(0);
    // setScore(0);
    // setTimeLeft(60); // Réinitialisation du temps
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-xl border border-gray-200 relative">
      {/* Timer Display */}
      {!showScore && (
        <div className="absolute top-4 right-4 text-xl font-semibold flex items-center gap-2">
          ⏰{" "}
          <span
            className={`${
              timeLeft <= 10 ? "text-red-500" : "text-blue-500"
            } font-bold`}
          >
            {timeLeft}s
          </span>
        </div>
      )}

      {showScore ? (
        <div className="text-center space-y-4">
          {score < (dataQuiz?.questions.length ?? 0) ? (
            <p className="text-lg font-semibold text-red-500">
              Ton score est de <span className="font-bold">{score}</span> sur{" "}
              {dataQuiz?.questions.length}
            </p>
          ) : (
            <p className="text-lg font-semibold text-green-500">
              🎉 Bravo ! Ton score est de{" "}
              <span className="font-bold">{score}</span> sur{" "}
              {dataQuiz?.questions.length}
            </p>
          )}
          <button
            onClick={Redirect}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300"
          >
            🔄 Voir le resultat
          </button>
        </div>
      ) : (
        <>
          {/* Section de la question */}
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              🧠 Compléter le quiz :
            </h2>
            <p className="text-lg font-medium text-gray-700">
              <span className="font-bold text-blue-500">
                Question {currentQuestion + 1}
              </span>{" "}
              sur {dataQuiz?.questions.length}
            </p>
            <p className="text-xl text-gray-800 font-medium">
              {dataQuiz?.questions[currentQuestion].questionText}
            </p>
          </div>

          {/* Section des options de réponse */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataQuiz?.questions[currentQuestion].answerOptions.map(
              (answerOption) => (
                <button
                  key={answerOption.answerText}
                  onClick={() =>
                    handleAnswerButtonClick(answerOption.isCorrect)
                  }
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  {answerOption.answerText}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};