"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { attendanceSchema, Attendancechema } from "@/lib/formsValidationSchema";
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
    resolver: zodResolver(attendanceSchema),
  });

  const [loading, setLoading] = useState(false); // Ajout de l'état local "loading"

  const [state, formAction] = useActionState(
    type === "create" ? createAttendance : updateAttendance,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const [isPending, startTransition] = useTransition();


  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    startTransition(() => {

      formAction(data);
    })
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
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create"
          ? "Créer une nouvelle présence"
          : "Modifier la présence"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Etudiant"
          name="studentUsername"
          defaultValue={data?.studentUsername}
          register={register}
          error={errors?.studentUsername}
        />

        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Présence</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
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

        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">classId</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
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
          type="dateTime"
        />

        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Matière</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
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

        {/* Nouveau champ pour le créneau horaire */}
        <div>
          <label htmlFor="session" className="text-xs font-medium text-gray-500">Session</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            id="session"
            {...register("session", {
              required: "Veuillez sélectionner une session",
            })}
          >
            <option value="MORNING">Matin</option>
            <option value="EVENING">Soir</option>
          </select>
          {errors.session && (
            <p className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">{errors.session.message}</p>
          )}
        </div>
      </div>
      <button
        disabled={loading}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
      >
        {type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default AttendanceForm;
