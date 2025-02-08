"use client";

import { createComplain } from "@/lib/actions/complainAction";
import { ComplainSchema, complainSchema } from "@/lib/formsValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { FieldErrors, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';

const ReclamationForm = ({quizId, studentId}: {quizId: string, studentId: string}) => {

  const router =useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ComplainSchema>({
    resolver: zodResolver(complainSchema),
  });

    const [state, formAction] = useFormState(createComplain, {
    success: false,
    error: false,
    message: "",
  });

  const onSubmit = (data: ComplainSchema) => {
    formAction({...data, quizId: quizId,studentId})
  }

  const onError = (errors: FieldErrors<ComplainSchema>) => {
    console.error('Erreurs:', errors);
    console.log('Valeurs actuelles:', getValues());
  };

  useEffect(() => {
    if (state.success) {
      toast.success("Reclamation ajouter avec success");
      router.push(`/`);
    } else if (state.error) {
      toast.error("une erreur c'est produite")
    }
  }, [router, state])

  return (
    <div>
      <form className=" p-4" onSubmit={handleSubmit(onSubmit, onError)}>
        <div className=" py-2 flex flex-col">
          <label className=" font-bold" htmlFor="field">
            L&apos;objet de votre reclamation
          </label>
          <div className=" flex items-center gap-2 mt-2">
            <input
              id="field"
              {...register("title")}
              className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
              placeholder="Entrer l'objet de votre reclamation"
            />
            {errors.title && <span>{errors.title.message}</span>}
          </div>
        </div>
        <div className=" py-2 flex flex-col">
          <label className=" font-bold" htmlFor="field">
            Decrivez votre problème
          </label>
          <div className=" flex items-center gap-2 mt-2">
            <textarea
              className="w-full p-3 text-base border-2 border-black rounded-lg shadow-[2.5px_3px_0px_#000] focus:shadow-[5.5px_7px_0px_#000] focus:outline-none transition-all duration-200"
              {...register("description")}
              id="field"
              placeholder="Decrivez votre problème"
            />
            {errors.title && <span>{errors.title.message}</span>}
          </div>
        </div>
        <button
          className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer mt-1 w-[250px]"
          type="submit"
        >
          <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0 ">
            Envoyer
          </span>
        </button>
      </form>
    </div>
  );
};
export default ReclamationForm;
