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
import { lessonSchema, LessonSchema } from "@/lib/formsValidationSchema";
import { createLesson, updateLesson } from "@/lib/actions/lessonAction";

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: { classes: any[]; subjects: any[] };
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    // Initialisation des valeurs par défaut pour le mode "update"
    // (les DateTime deviennent des chaînes "HH:MM" pour les inputs time)
    defaultValues: data
      ? {
          ...data,
          startTime: data.startTime
            ? new Date(data.startTime).toISOString().slice(11, 16)
            : "08:00",
          endTime: data.endTime
            ? new Date(data.endTime).toISOString().slice(11, 16)
            : "09:00",
        }
      : { startTime: "08:00", endTime: "09:00" },
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createLesson : updateLesson,
    {
      success: false,
      error: false,
      message: "",
    }
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);

    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Lesson a été ${type === "create" ? "créé" : "modifié"} !`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
    }
  }, [state, router, type, setOpen]);

  const { classes, subjects } = relatedData || { classes: [], subjects: [] };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold text-gray-800">
        {type === "create" ? "Créer un nouvel lesson" : "Modifier un lesson"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom de la Lesson"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Jour</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("day")}
            defaultValue={data?.day}
          >
            <option value="MONDAY">Lundi</option>
            <option value="TUESDAY">Mardi</option>
            <option value="WEDNESDAY">Mercredi</option>
            <option value="THURSDAY">Jeudi</option>
            <option value="FRIDAY">Vendredi</option>
          </select>
          {errors.day && (
            <p className="text-xs text-red-400">{errors.day.message}</p>
          )}
        </div>
        <InputField
          label="Enseignant"
          name="teacherUsername"
          defaultValue={data?.teacher.username}
          register={register}
          error={errors?.teacherUsername}
        />
        {/* Créneau horaire hebdomadaire (emploi du temps) */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Heure de début</label>
          <input
            type="time"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("startTime")}
            defaultValue={
              data?.startTime
                ? new Date(data.startTime).toISOString().slice(11, 16)
                : "08:00"
            }
          />
          {errors.startTime && (
            <p className="text-xs text-red-400">{errors.startTime.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Heure de fin</label>
          <input
            type="time"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("endTime")}
            defaultValue={
              data?.endTime
                ? new Date(data.endTime).toISOString().slice(11, 16)
                : "09:00"
            }
          />
          {errors.endTime && (
            <p className="text-xs text-red-400">{errors.endTime.message}</p>
          )}
        </div>
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

      <div className="flex flex-col gap-1.5 w-full md:w-1/4">
        <label className="text-xs font-medium text-gray-500">Classe</label>
        <select
          className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
          {...register("classId")}
          defaultValue={data?.classId}
        >
          {classes.map((classItem) => (
            <option value={classItem.id} key={classItem.id}>
              {classItem.name} (Capacité : {classItem.capacity})
            </option>
          ))}
        </select>
        {errors.classId && (
          <p className="text-xs text-red-400">{errors.classId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full md:w-1/4">
        <label className="text-xs font-medium text-gray-500">Matière</label>
        <select
          className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
          {...register("subjectId")}
          defaultValue={data?.subjectId}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        {errors.subjectId && (
          <p className="text-red-400 text-xs">{errors.subjectId.message}</p>
        )}
      </div>

      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message || "Une erreur s'est produite"}
        </span>
      )}

      <button
        disabled={loading}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
      >
        {loading ? "Chargement..." : type === "create" ? "Créer" : "Modifier"}
      </button>
    </form>
  );
};

export default LessonForm;
