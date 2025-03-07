"use client";

import {
  useEffect,
  useState,
  useCallback,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Question } from "@prisma/client";
import { submitStudentAnswers } from "@/lib/actions/submitStudentAnswer";
import { useForm } from "react-hook-form";
import {
  StudentAnswerschema,
  studentAnswerSchema,
} from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

type StudentAnswerProps = {
  questions: Question[];
  quizId: string;
  studentId: string;
  role: string;
  duration: number; // Durée en minutes
};

export const StudentAnswer = ({
  questions,
  quizId,
  studentId,
  role,
  duration,
}: StudentAnswerProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentAnswerschema>({
    resolver: zodResolver(studentAnswerSchema),
  });

  const [state, formAction] = useActionState(submitStudentAnswers, {
    success: false,
    error: false,
    message: "",
  });

  // Gestion du chronomètre
  useEffect(() => {
    if (submitted || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [submitted, timeLeft]);

  const handleAutoSubmit = useCallback(() => {
    const form = document.getElementById("quiz-form") as HTMLFormElement;
    if (form) form.requestSubmit();
  }, []);

  // Soumission automatique quand le temps est écoulé
  useEffect(() => {
    if (timeLeft === 0 && !submitted && role === "student") {
      handleAutoSubmit();
    } else if (timeLeft === 0 && !submitted) {
      toast.error("Le temps est écoulé");
      router.push(`/list/onlineExam`);
    }
  }, [timeLeft, submitted, handleAutoSubmit, role, router]);

  const [isPending, startTransition] = useTransition();

  // Soumission du formulaire
  const onSubmit = handleSubmit(async (data: StudentAnswerschema) => {
    try {
      setSubmitted(true);
      const answersWithIds = data.answers.map((answer) => ({
        ...answer,
        studentId,
        quizId,
      }));
      startTransition(() => {
        formAction(answersWithIds);
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi des réponses", error);
      setSubmitted(false);
      toast.error("Une erreur est survenue");
    }
  });

  // Gestion des réponses du serveur
  useEffect(() => {
    if (state.success) {
      toast.success("Réponses enregistrées avec succès");
      router.push("/list/resultExam");
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message);
      setSubmitted(false);
    }
  }, [state, router]);

  // Formatage du temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6">Répondez aux questions :</h2>
      <div className="text-right mb-4 text-xl font-semibold">
        Temps restant :{" "}
        <span className={`${timeLeft < (duration * 60) / 2 && "text-red-400"}`}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {submitted ? (
        <p className="text-center text-lg font-semibold">
          Réponses envoyées avec succès!
        </p>
      ) : (
        <form id="quiz-form" onSubmit={onSubmit} className="space-y-6">
          {questions.map((question: Question, index: number) => (
            <div key={question.id} className="flex flex-col">
              <p className="font-bold">Question {index + 1}:</p>
              <label>{question.questionText}</label>
              <input
                {...register(`answers.${index}.questionId`)}
                type="hidden"
                value={question.id}
              />
              <textarea
                defaultValue={"Aucune reponse rendu"}
                {...register(`answers.${index}.answerText`)}
                className="border-2 p-2 rounded"
                disabled={submitted}
              />
              {errors.answers?.[index]?.answerText && (
                <span className="text-red-500 text-sm">
                  {errors.answers[index]?.answerText?.message}
                </span>
              )}
            </div>
          ))}

          {state.error && (
            <p className="text-red-500 text-center">{state.message}</p>
          )}

          {role === "student" && !submitted && (
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Envoyer les réponses
            </button>
          )}
        </form>
      )}
    </div>
  );
};
