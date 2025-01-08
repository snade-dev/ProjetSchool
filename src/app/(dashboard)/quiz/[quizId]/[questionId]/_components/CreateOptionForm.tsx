"use client";

import { createOption } from "@/lib/actions/quizAction";
import {
  answerOptionSchema,
  AnswerOptionSchema,
} from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

const CreateOptionForm = ({questionId}: {questionId: string}) => {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnswerOptionSchema>({
    resolver: zodResolver(answerOptionSchema),
    defaultValues: {},
  });

  const [state, formAction] = useFormState(createOption, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Quiz créer avec success");
      router.refresh();
    } else if(state.error) {
      toast.error(state.message)
    }
  }, [state, router]);

  const onSubmit = handleSubmit((data: AnswerOptionSchema) => {
    console.log("data:"+data+"questionId"+questionId);
    formAction({...data,questionId: questionId});
  });

  return (
    <form onSubmit={onSubmit}>
      <div className=" py-2 flex flex-col">
        <label className=" font-bold" htmlFor="field">
          Ajouter une option de reponse
        </label>
        <div className=" flex items-center gap-2 mt-2">
          <input
            id="field"
            {...register("id")}
            className=" hidden"
          />
          <input
            id="field"
            type="text"
            {...register("answerText")}
            placeholder="Entrer la question"
            className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
          />
          <div className="flex items-center">
            <label className="relative flex items-center cursor-pointer select-none">
              {/* Input Checkbox caché */}
              <input
                type="checkbox"
                {...register("isCorrect")}
                className="absolute w-0 h-0 opacity-0 peer"
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
          <button
            className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer self-center mt-1"
            type="submit"
          >
            <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
              Ajouter
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};
export default CreateOptionForm;
