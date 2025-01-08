"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { attendancechema, Attendancechema } from "@/lib/formsValidationSchema";
import { useFormState } from "react-dom";
import {
  createAttendance,
  updateAttendance,
} from "@/lib/actions/attendanceAction";

const AttendanceForm = ({
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
  } = useForm<Attendancechema>({
    resolver: zodResolver(attendancechema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"

  const [state, formAction] = useFormState(
    type === "create" ? createAttendance : updateAttendance,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`L'annonce a été ${type === "create" ? "créée" : "modifiée"}!`);
      setOpen(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  const { students, subjects, classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Créer une nouvelle présence"
          : "Modifier la présence"}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Informations d&apos;authentification
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Etudiant"
          name="studentUsername"
          defaultValue={data?.studentUsername}
          register={register}
          error={errors?.studentUsername}
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Présence</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("present")}
            >
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
          {errors.present && (
            <p className="text-xs text-red-400 font-bold">
              {errors.present?.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">classId</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map((classe: { id: number; name: string }) => (
              <option value={classe.id} key={classe.id}>
                {classe.name}
              </option>
            ))}
            
          </select>
          {errors.classId && (
            <p className="text-xs text-red-400 font-bold">
              {errors.classId?.message}
            </p>
          )}
        </div>

        <InputField
          label="Date"
          name="date"
          defaultValue={data?.date}
          register={register}
          error={errors?.date}
          type="dateTime-local"
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Matière</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjectId")}
            defaultValue={data?.subjectId}
          >
            {subjects.map((subject: { id: number; name: string }) => (
              <option value={subject.id} key={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId && (
            <p className="text-xs text-red-400 font-bold">
              {errors.subjectId?.message}
            </p>
          )}
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

export default AttendanceForm;
