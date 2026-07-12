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
import { createExam, updateExam } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { examSchema, ExamSchema } from "@/lib/formsValidationSchema";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

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
    watch,
    formState: { errors },
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
  });

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
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
    startTransition(() => {
      formAction(data);
    });
  });

  const { lessons, semesters } = relatedData;

  // V01 — la leçon choisie impose le régime : seules les périodes de ce régime
  // sont proposées (toutes tant qu'aucune leçon n'est choisie).
  const watchedLessonId = watch("lessonId") ?? data?.lessonId;
  const selectedLesson = lessons.find(
    (l: { id: number | string }) => String(l.id) === String(watchedLessonId)
  );
  const visibleSemesters = selectedLesson?.class?.evaluationSystem
    ? semesters.filter(
        (s: { system?: string }) =>
          s.system === selectedLesson.class.evaluationSystem
      )
    : semesters;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create" ? "Créer un nouvel examen" : "Modifier un examen"}
        entity="Examen"
        onClose={() => setOpen(false)}
      />

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
      <div className="flex flex-col gap-1.5 w-full md:w-1/4">
        <label className="text-xs font-medium text-gray-500">Leçon</label>
        <select
          className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
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

      {/* Sélection de la période (filtrée par le régime de la classe de la leçon) */}
      <div className="flex flex-col gap-1.5 w-full md:w-1/4">
        <label className="text-xs font-medium text-gray-500">Période</label>
        <select
          className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
          {...register("semesterId")}
          defaultValue={data?.semesters}
        >
          {visibleSemesters?.map((semester: { id: string; name: string }) => (
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
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">Une erreur s&apos;est produite !</span>
      )}

      <FormFooter
        loading={loading}
        label={type === "create" ? "Créer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default ExamForm;
