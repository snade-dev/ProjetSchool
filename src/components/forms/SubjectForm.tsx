"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "../InputField";
import { subjectSchema, SubjectSchema } from "@/lib/formsValidationSchema";
import { createSubject, updateSubject } from "@/lib/actions";
import { Dispatch, SetStateAction, useEffect, useState, useActionState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const SubjectForms = ({
  type,
  setOpen,
  data,
  relatedData,
}: {
  type: "create" | "update";
  setOpen: Dispatch<SetStateAction<boolean>>;
  data?: any;
  relatedData?: any;
}) => {
  const { teachers } = relatedData;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
  });

    const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"
  

  const [state, formAction] = useActionState(
    type === "create" ? createSubject : updateSubject,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    setLoading(true);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Sujet ${type === "create" ? "créer" : "modifier"}`);
      setLoading(false)
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);

  return (
    <form className=" flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className=" text-xl font-semibold">
        {type === "create"
          ? "Créer un nouveau Professeur"
          : "Modifier un Professeur"}
      </h1>
      <span className=" text-xs text-gray-400 font-medium">
        Information d&apos;authentification
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom du sujet"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}
        <div className=" flex flex-col gap-2 w-full md:w-1/4">
          <label className=" text-xs text-gray-500">Teachers</label>
          <select
            multiple
            className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("teachers")}
            defaultValue={data?.teachers}
          >
             {teachers.map(
              (teacher: { id: string; name: string; surname: string }) => (
                <option value={teacher.id} key={teacher.id}>
                  {teacher.name + " " + teacher.surname}
                </option>
              )
            )}
          </select>
          {errors.teachers?.message && (
            <p className=" text-red-400 text-xs">
              {errors.teachers?.message.toString()}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <span className=" text-red-400 font-bold">
          Une erreur c&apos;est produite
        </span>
      )}

      <button className=" bg-blue-400 text-white p-2 rounded-md" type="submit">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};
export default SubjectForms;
