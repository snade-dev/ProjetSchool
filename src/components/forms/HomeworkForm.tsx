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
import { homeworkSchema, HomeworkSchema } from "@/lib/formsValidationSchema";
import { createHomework, updateHomework } from "@/lib/actions/homeworkAction";
import UploadField from "../UploadField";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

/**
 * W14 — publication d'un devoir à faire (§2.3.8).
 * relatedData :
 * - classes / subjects : options des sélecteurs ;
 * - pairs (teacher uniquement) : couples (classId, subjectId) où il enseigne —
 *   la matière proposée est filtrée par la classe choisie (même règle que la
 *   saisie de notes, revérifiée côté serveur).
 */
const HomeworkForm = ({
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
  } = useForm<HomeworkSchema>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      classId: data?.classId,
      subjectId: data?.subjectId,
    },
  });

  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | undefined>(
    data?.fileUrl ?? undefined
  );

  const [state, formAction] = useActionState(
    type === "create" ? createHomework : updateHomework,
    { success: false, error: false, message: "" }
  );

  const [, startTransition] = useTransition();

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction({ ...formData, fileUrl: fileUrl ?? "" });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Devoir ${type === "create" ? "publié" : "modifié"} !`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);

  const { classes = [], subjects = [], pairs } = relatedData ?? {};

  // Teacher : la matière proposée dépend de la classe choisie (ses Lessons).
  const watchedClassId = watch("classId");
  const subjectOptions = pairs
    ? subjects.filter((s: { id: number }) =>
        pairs.some(
          (p: { classId: number; subjectId: number }) =>
            p.subjectId === s.id && p.classId === Number(watchedClassId)
        )
      )
    : subjects;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create" ? "Publier un devoir" : "Modifier un devoir"}
        entity="Devoir"
        onClose={() => setOpen(false)}
      />
      <FormSection>Devoir à faire</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
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

        <InputField
          label="Titre du devoir"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />

        <InputField
          label="Date de rendu"
          name="dueDate"
          type="date"
          defaultValue={
            data?.dueDate
              ? new Date(data.dueDate).toISOString().split("T")[0]
              : undefined
          }
          register={register}
          error={errors?.dueDate}
        />

        {/* Classe */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Classe</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            <option value="">-- Choisir --</option>
            {classes.map((c: { id: number; name: string }) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>

        {/* Matière — filtrée par la classe choisie pour un enseignant */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Matière</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("subjectId")}
            defaultValue={data?.subjectId}
          >
            <option value="">-- Choisir --</option>
            {subjectOptions.map((s: { id: number; name: string }) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.subjectId?.message && (
            <p className="text-xs text-red-400">
              {errors.subjectId.message.toString()}
            </p>
          )}
        </div>

        {/* Consignes */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-gray-500">Consignes</label>
          <textarea
            placeholder="Consignes du devoir (exercices, pages, attendus…)"
            defaultValue={data?.content}
            rows={6}
            {...register("content")}
            className="ring-[1.5px] ring-gray-300 p-2.5 rounded-md w-full text-sm outline-none transition focus:ring-2 focus:ring-lamaSky"
          />
          {errors.content && (
            <p className="text-xs text-red-400">{errors.content.message}</p>
          )}
        </div>

        {/* Pièce jointe optionnelle — flux /api/upload existant (+ PDF, W14) */}
        <UploadField
          label="Joindre un document (image ou PDF)"
          value={fileUrl}
          onChange={setFileUrl}
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        />
      </div>

      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {(state as any).message || "Une erreur s'est produite"}
        </span>
      )}

      <FormFooter
        loading={loading}
        label={type === "create" ? "Publier" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default HomeworkForm;
