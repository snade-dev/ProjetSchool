"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";

import { Dispatch, SetStateAction, useEffect, useState, useActionState, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { resultMSchema, ResultMSchema } from "@/lib/formsValidationSchema";
import { createAverage, updateAverage } from "@/lib/actions/averageAction";

const AverageForm = ({
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
  } = useForm<ResultMSchema>({
    resolver: zodResolver(resultMSchema),
  });

  const [loading, setLoading] = useState(false);
  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

    const [isPending, startTransition] = useTransition();
  
  const [state, formAction] = useActionState(
    type === "create" ? createAverage : updateAverage,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    // console.log(data);
    setLoading(true);

    startTransition(() => {

      formAction(data);
    })
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

  const { exams } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Créer une nouvelle moyenne"
          : "Modifier la moyenne"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Moyenne"
          name="average"
          defaultValue={data?.average}
          register={register}
          error={errors?.average}
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

export default AverageForm;
