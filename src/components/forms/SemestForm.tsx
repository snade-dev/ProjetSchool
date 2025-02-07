"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { semesterSchema, SemesterSchema } from "@/lib/formsValidationSchema";
import { createSemester, updateSemester } from "@/lib/actions/semesterActions";
import { useFormState } from "react-dom";

const SemesterForm = ({
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
  } = useForm<SemesterSchema>({
    resolver: zodResolver(semesterSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createSemester : updateSemester,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    console.log(state); // Débogage de l'état
    if (state.success) {
      toast(`Le semestre a été ${type === "create" ? "créé" : "mis à jour"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { semesters} = relatedData;
  // console.log(semesters); // Vérification des données liées aux classes

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Créer un nouveau semestre"
          : "Modifier le semestre"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom du semestre"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        {data && (
          <InputField
            label="Identifiant"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>

      {state.error && (
        <span className="text-red-500">
          {state.message ? state.message : "Une erreur c&apos;est produite!"}
        </span>
      )}

      <button className="bg-blue-400 text-white p-2 rounded-md" type="submit">
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default SemesterForm;
