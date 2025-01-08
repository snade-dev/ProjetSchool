"use client";

import { updateQuestion } from "@/lib/actions/quizAction";
import { questionSchema, QuestionSchema } from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Question } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

const TextForm = ({data}: {data: Question}) => {
    const router = useRouter();


    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<QuestionSchema>({
        resolver: zodResolver(questionSchema),
        defaultValues: {
          
        },
      });

    const [state, formAction] = useFormState(updateQuestion, {
        success: false,
        error: false,
        message: "",
      });

      useEffect(() => {
        if (state.success) {
          toast.success("Quiz créer avec success");
          router.refresh();
        }
      }, [state, router]);

const onSubmit= handleSubmit((data: QuestionSchema) => {
    formAction(data)
})

  return (
    <form onSubmit={onSubmit}>
      <div className=" py-2 flex flex-col">
        <label className=" font-bold" htmlFor="field">
          Modifier la question
        </label>
        <div className=" flex items-center gap-2 mt-2">
            <input id="field" defaultValue={data.id} {...register("id")} className=" hidden" />
          <input
            id="field"
            type="text"
            defaultValue={data.questionText}
            {...register("questionText")}
            placeholder="Entrer la question"
            className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
          />
          <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer self-center mt-1" type="submit">
            <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
              Modifier
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};
export default TextForm;
