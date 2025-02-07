"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { resultSchema, ResultSchema } from "@/lib/formsValidationSchema";
import { createResult, updateResult } from "@/lib/actions/resultAction";

const ResultForm = ({
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
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const [loading, setLoading] = useState(false);
  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useFormState(
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    // console.log(data);
    setLoading(true);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`La moyenne a été ${type === "create" ? "créée" : "mise à jour"}!`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  const { exams, subjects,semesters } = relatedData;

  

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Créer une nouvelle moyenne"
          : "Modifier la moyenne"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Note"
          name="score"
          defaultValue={data?.score}
          register={register}
          error={errors?.score}
        />
        <InputField
          label="Nom du l'etudiant"
          name="studentUsername"
          defaultValue={data?.student.username}
          register={register}
          error={errors.studentUsername}
        />

        <div className=" flex flex-col gap-2 w-full md:w-1/4">
          <label className=" text-xs text-gray-500">Exam</label>
          <select
            className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("examId")}
            defaultValue={data?.examId}
          >
            {exams.map((exam: { id: string; title: string }) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
          {errors.examId?.message && (
            <p className=" text-red-400 text-xs">
              {errors.examId?.message.toString()}
            </p>
          )}
        </div>
        <div className=" flex flex-col gap-2 w-full md:w-1/4">
          <label className=" text-xs text-gray-500">Sujet</label>
          <select
            className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("subjectId")}
            defaultValue={data?.subjectId}
          >
            {subjects.map((subject: { id: string; name: string }) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId?.message && (
            <p className=" text-red-400 text-xs">
              {errors.subjectId?.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Semestre</label>
          <select
            className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("semesterId")}
            defaultValue={data?.semesterId}
          >
            {semesters?.map(
              (semester: { id: number; name: string }) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              )
            )}
          </select>
          {errors.semesterId?.message && (
            <p className="text-red-400 text-xs">
              {errors.semesterId?.message.toString()}
            </p>
          )}
        </div>

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
          {state.message ? state.message : "Une erreur c'est produite!"}
        </span>
      )}

      <button
        disabled={loading}
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-500"
        type="submit"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default ResultForm;
