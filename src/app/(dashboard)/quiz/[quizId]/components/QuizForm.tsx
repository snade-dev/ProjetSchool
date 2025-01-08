"use client";

import { createQuestion, createQuiz } from "@/lib/actions/quizAction";
import { questionSchema, QuestionSchema } from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import {  useForm } from "react-hook-form";
import { toast } from "react-toastify";

const QuizForm = ({quizId}: {quizId: string}) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuestionSchema>({
    resolver: zodResolver(questionSchema),
    defaultValues: {},
  });
  const router = useRouter();

  const [state, formAction] = useFormState(createQuestion, {
    success: false,
    error: false,
    message: "",
  });

  //   console.log(data);

  const onSubmit = handleSubmit((data: QuestionSchema) => {
    console.log(data, quizId);
    formAction({...data, quizId: quizId});
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Question créer avec success");
      router.refresh();
    } else if (state.error) {
      toast.error(state.message)
    }
  }, [state, router]);

  return (
    <form onSubmit={onSubmit}>
      <input
        id="field"
        type="text"
        {...register("questionText")}
        placeholder="Entrer la question"
        className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
      />

      <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer mb-6 mt-4" type="submit">
        <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
          Créer
        </span>
      </button>
    </form>
  );
};
export default QuizForm;
