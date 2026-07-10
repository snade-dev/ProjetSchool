"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputField from "../InputField";
import { subjectSchema, SubjectSchema } from "@/lib/formsValidationSchema";
import { createSubject, updateSubject } from "@/lib/actions";
import { Dispatch, SetStateAction, useEffect, useState, useActionState, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

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

    const [isPending, startTransition] = useTransition();
  

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
    startTransition(() => {

      formAction(data);
    })
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
      <DrawerHeader
        title={type === "create"
          ? "Créer un nouveau Professeur"
          : "Modifier un Professeur"}
        entity="Matière"
        onClose={() => setOpen(false)}
      />
      <FormSection>Information d&apos;authentification</FormSection>
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
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Teachers</label>
          <select
            multiple
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
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
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          Une erreur c&apos;est produite
        </span>
      )}

      <FormFooter
        loading={loading}
        label={type === "create" ? "Create" : "Update"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};
export default SubjectForms;
