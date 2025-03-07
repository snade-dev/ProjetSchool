"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  teacherResponsSchema,
  TeacherResponsschema,
} from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import { Prisma } from "@prisma/client";
import { teacherReponseAction } from "@/lib/actions/teacherReponseAction";

type QuestionWithAnswers = Prisma.QuestionGetPayload<{
  include: {
    StudentAnswer: true;
  };
}>;

type CorrectProps = {
  questions: QuestionWithAnswers[];
  quizId: string;
  studentId: string;
  role: string;
};

export const UpdateCorrect = ({
  questions,
  quizId,
  studentId,
  role,
}: CorrectProps) => {
  // console.log(questions[0].StudentAnswer);

  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherResponsschema>({
    resolver: zodResolver(teacherResponsSchema),
  });

  const [state, formAction] = useActionState(teacherReponseAction, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Reponses enregistrer avec success");
      router.push(`/list/resultExam`);
      router.refresh();
    } else if (state.error) {
      toast.error("Erreur lors de l'enregistrement des réponses");
    }
  }, [state, router, quizId]);

  const onSubmit = handleSubmit((data: TeacherResponsschema) => {
    try {
      // Ajouter studentId et quizId à chaque réponse
      const answersWithIds = data.answers.map((answer, index) => ({
        ...answer,
        studentId,
        quizId,
        questionId: questions[index].id, // Ajouter l'ID de la question
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label>{question.questionText}</label>
                  <div className=" bg-slate-100 p-2 rounded-lg">
                    {question.StudentAnswer.length !== 0
                      ? question.StudentAnswer[0].answerText
                      : "pas de reponse"}
                  </div>
                </div>
                <div className="flex flex-col">
                  <label htmlFor="">Notes :</label>
                  <input
                    type="number"
                    placeholder="Entrez la note"
                    defaultValue={question.StudentAnswer[0].score}
                    className="border border-gray-300 p-2 rounded-lg"
                    {...register(`answers.${index}.score`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                {errors.answers?.[index]?.score && (
                  <span className="text-red-500 text-sm">
                    {errors.answers[index]?.score?.message}
                  </span>
                )}
              </div>
            </div>
          ))}
          {state.error && state.message}
          {(role === "teacher" || role==="admin") && (
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
            >
              Envoyer les réponses
            </button>
          )}
        </form>
      )}
    </div>
  );
};
