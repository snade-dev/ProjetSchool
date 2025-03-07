"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { attestationSchema, AttestationSchema} from "@/lib/formsValidationSchema";
import { updateQuiz } from "@/lib/actions/quizAction";
import { createAttestation, updateAttestation } from "@/lib/actions/attestationAction";

const AttestationForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttestationSchema>({
    resolver: zodResolver(attestationSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  const [isPending, startTransition] = useTransition();


  const [state, formAction] = useActionState(
    type === "create" ? createAttestation : updateAttestation,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const {studentId} = relatedData 

  const onSubmit = handleSubmit((data) => {

    setLoading(true);
    startTransition(() => {

      formAction({...data, studentId: studentId});
    })
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`la demande à été ${type === "create" ? "crée" : "modifier"}!`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);
  // console.log("leeosns", lessons);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Effectuer une demande d'attestation"
          : "Modifier une demande d'attestation"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Titre de la demande"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
         <textarea
          placeholder="description de la demande"
          defaultValue={data?.description}
          {...register("description")}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md w-full"
        />
      </div>

      <button
        disabled={loading}
        type="submit"
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-500"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default AttestationForm;
