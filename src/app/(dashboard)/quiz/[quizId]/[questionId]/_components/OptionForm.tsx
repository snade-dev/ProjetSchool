"use client";

import { updateOption } from "@/lib/actions/quizAction";
import {
  answerOptionSchema,
  AnswerOptionSchema,
} from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnswerOption } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

const OptionForm = ({ data, questionId }: { data: AnswerOption,questionId: string }) => {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnswerOptionSchema>({
    resolver: zodResolver(answerOptionSchema),
    defaultValues: {
      id: data.id,
      answerText: data.answerText,
      isCorrect: data.isCorrect, // Initialisation de la checkbox ici
    },
  });

  const [state, formAction] = useFormState(updateOption, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Option modifier avec success");
      router.refresh();
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [state, router]);

  const onSubmit = handleSubmit((option: AnswerOptionSchema) => {
    console.log(option);

    formAction({...option, questionId: questionId});
  });

  return (
    <form onSubmit={onSubmit}>
      <div className=" py-2 flex flex-col">
        <div className=" flex items-center gap-2 mt-2">
          <input
            type="text"
            defaultValue={data.id}
            {...register("id")}
            className=" hidden"
          />
          <input
            id="field"
            type="text"
            defaultValue={data.answerText}
            {...register("answerText")}
            placeholder="Entrer la question"
            className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
          />
          <div className="flex items-center">
            <label className="relative flex items-center cursor-pointer select-none">
              {/* Input Checkbox caché */}
              <input
                type="checkbox"
                // defaultValue={data.isCorrect.toString()}
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
          {state.error && <p className=" text-red-300">{state.message}</p>}
          <button
            className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer self-center mt-1"
            type="submit"
          >
            <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
              Modifier
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};
export default OptionForm;
