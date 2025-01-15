"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@prisma/client";
import { submitStudentAnswers } from "@/lib/actions/submitStudentAnswer";
import { useForm } from "react-hook-form";
import {
  StudentAnswerschema,
  studentAnswerSchema,
} from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";

type StudentAnswerProps = {
  questions: Question[];
  quizId: string;
  studentId: string;
};

export const StudentAnswer = ({
  questions,
  quizId,
  studentId,
}: StudentAnswerProps) => {
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentAnswerschema>({
    resolver: zodResolver(studentAnswerSchema),
  });

  const [state, formAction] = useFormState(submitStudentAnswers, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Reponses enregistrer avec success");
      router.push("/")
      router.refresh();
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data: StudentAnswerschema) => {
    try {
      // Ajouter studentId et quizId à chaque réponse
      const answersWithIds = data.answers.map((answer) => ({
        ...answer,
        studentId,
        quizId,
      }));

      // Appeler la Server Action
      const result = formAction(answersWithIds);
    } catch (error) {
      console.error("Erreur lors de l'envoi des réponses", error);
    }
  });

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6">Répondez aux questions :</h2>
      {submitted ? (
        <p className="text-center text-lg font-semibold">
          Réponses envoyées avec succès!
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {questions.map((question: any, index: number) => (
            <div key={question.id} className=" flex flex-col">
              <label>{question.questionText}</label>
              <input
                {...register(`answers.${index}.questionId`)}
                type="hidden"
                value={question.id}
              />
              <textarea {...register(`answers.${index}.answerText`)} className=" border-2" />
              {errors.answers?.[index]?.answerText && (
                <span>{errors.answers[index]?.answerText?.message}</span>
              )}
            </div>
          ))}
          {state.error && state.message}
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
          >
            Envoyer les réponses
          </button>
        </form>
      )}
    </div>
  );
};
