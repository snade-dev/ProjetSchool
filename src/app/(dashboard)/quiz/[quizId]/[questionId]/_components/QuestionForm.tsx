"use client";

import { createQuiz, updateQuestion } from "@/lib/actions/quizAction";
import { questionSchema, QuestionSchema } from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnswerOption, Question } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "react-toastify";

const QuestionForm = ({
  // questionId,
  data,
}: {
  // questionId: string;
  data: Question & { answerOptions: AnswerOption[] };
}) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuestionSchema>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionText: data.questionText,
      answerOptions: [
        { answerText: "", isCorrect: false },
        { answerText: "", isCorrect: false },
      ],
    },
  });
  const router = useRouter();

  const [state, formAction] = useFormState(updateQuestion, {
    success: false,
    error: false,
    message: "",
  });

  const { fields: answerFields, append: appendAnswer } = useFieldArray({
    control,
    name: `answerOptions`,
  });

  //   console.log(data);

  const onSubmit = handleSubmit((data: QuestionSchema) => {
    console.log(data);
    formAction(data);
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Quiz créer avec success");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action="" onSubmit={onSubmit}>
      <div>
        <div className=" py-2 flex flex-col">
          <label className=" font-bold" htmlFor="field">
            Entrer la question
          </label>
          <input
            id="field"
            type="text"
            defaultValue={data.questionText}
            {...register(`questionText`)}
            placeholder="Entrer la question"
            className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200 my-2 mr-2"
          />
        </div>
        <input
          id="field"
          type="text"
          defaultValue={data.id}
          {...register(`id`)}
          placeholder="Entrer la question"
          className="hidden"
        />
        {answerFields.map((answerOption, answerIndex) => (
          <div key={answerIndex}>
            <label htmlFor="answerOption" className=" mr-2">
              Entrer la réponse
            </label>
            <div className=" flex">
              <input
                key={answerOption.answerText}
                id="answerOption"
                defaultValue={data.answerOptions[answerIndex]?.answerText}
                placeholder="Entrer des options de reponses"
                className="w-full max-w-[290px] p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200 my-2 mr-2"
                {...register(`answerOptions.${answerIndex}.answerText`)}
              />
              <div className="flex items-center">
                <label className="relative flex items-center cursor-pointer select-none">
                  {/* Input Checkbox caché */}
                  <input
                    type="checkbox"
                    className="absolute w-0 h-0 opacity-0 peer"
                    defaultValue={data.answerOptions[
                      answerIndex
                    ]?.isCorrect.toString()}
                  />
                  {/* Case visuelle */}
                  <span className="w-6 h-6 flex items-center justify-center border-2 border-gray-800 rounded-md transition-all duration-300 peer-checked:bg-gray-800 peer-checked:border-gray-800 peer-checked:scale-110 peer-hover:scale-105 peer-focus:ring-2 peer-focus:ring-gray-500">
                    {/* Symbole de coche comme élément HTML */}
                    <span className=" text-white peer-checked:block text-lg">
                      ✓
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {state.error && (
        <span className="text-red-500">
          {state.message ? state.message : "Une erreur c'est produite!"}
        </span>
      )}

      <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer mb-6 mt-4">
        <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
          Créer
        </span>
      </button>
    </form>
  );
};
export default QuestionForm;
