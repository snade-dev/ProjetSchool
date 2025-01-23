"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { quizSchema, QuizSchema } from "@/lib/formsValidationSchema";
import { createQuiz, updateQuiz } from "@/lib/actions/quizAction";

const QuizForm = ({
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
  } = useForm<QuizSchema>({
    resolver: zodResolver(quizSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"

  const [state, formAction] = useFormState(
    type === "create" ? createQuiz : updateQuiz,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    // console.log("hello");
    // console.log(data);
    setLoading(true);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`le quiz à été ${type === "create" ? "crée" : "modifier"}!`);
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

  const { classes, subjects } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Créer un nouvel examen en ligne"
          : "Modifier un examen en ligne"}
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
          label="Date"
          name="date"
          defaultValue={data?.date}
          register={register}
          error={errors?.date}
          type="dateTime-local"
        />
        <InputField label="Durée" name="duration" defaultValue={data?.duration} register={register} error={errors?.duration} />
        {/* <div>
          <label htmlFor="">number</label>
          <input type="number" {...register("duration")} />
          {errors.duration && (
            <p className=" text-red-400">{errors.duration.message?.toString()}</p>
          )}
          
        </div> */}
        <InputField
          label="Enseignant"
          name="teacherUsername"
          defaultValue={data?.teacher.username}
          register={register}
          error={errors?.teacherUsername}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Classe</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map(
              (classItem: {
                id: number;
                name: string;
                capacity: number;
                _count: { students: number };
              }) => (
                <option value={classItem.id} key={classItem.id}>
                  ({classItem.name} - {classItem.capacity} Capacité)
                </option>
              )
            )}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
        <div className=" flex flex-col gap-2 w-full md:w-1/4">
          <label className="font-bold">Sujet</label>
          <select
            className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
            {...register("subjectId")}
          >
            {subjects.map((subject: { id: number; name: string }) => (
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
      </div>
      {data && (
        <InputField
          label="Id"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors?.id}
          hidden
        />
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

export default QuizForm;
