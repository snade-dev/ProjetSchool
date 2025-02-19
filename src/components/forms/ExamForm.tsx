"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { createExam, updateExam } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { examSchema, ExamSchema } from "@/lib/formsValidationSchema";

const ExamForm = ({
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
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
  });

  const [loading, setLoading] = useState(false);
  const [state, formAction] = useFormState(
    type === "create" ? createExam : updateExam,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`L'examen a été ${type === "create" ? "créé" : "modifié"} !`);
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    formAction(data);
  });
  

  const { lessons, semesters } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Créer un nouvel examen" : "Modifier un examen"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Titre de l'examen"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Date de début"
          name="startTime"
          defaultValue={data?.startTime}
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />
        <InputField
          label="Date de fin"
          name="endTime"
          defaultValue={data?.endTime}
          register={register}
          error={errors?.endTime}
          type="datetime-local"
        />
      </div>

      {data && (
        <InputField
          label="ID"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors?.id}
          hidden
        />
      )}

      {/* Sélection de la leçon */}
      <div className="flex flex-col gap-2 w-full md:w-1/4">
        <label className="text-xs text-gray-500">Leçon</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("lessonId")}
          defaultValue={data?.lessons}
        >
          {lessons.map((subject: { id: string; name: string }) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        {errors.lessonId?.message && (
          <p className="text-xs text-red-400">{errors.lessonId.message}</p>
        )}
      </div>

      {/* Sélection du semestre */}
      <div className="flex flex-col gap-2 w-full md:w-1/4">
        <label className="text-xs text-gray-500">Semestre</label>
        <select
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("semesterId")}
          defaultValue={data?.semesters}
        >
          {semesters?.map((semester: { id: string; name: string }) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
        {errors.semesterId?.message && (
          <p className="text-xs text-red-400">{errors.semesterId.message}</p>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">Une erreur s&apos;est produite !</span>
      )}

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

export default ExamForm;
