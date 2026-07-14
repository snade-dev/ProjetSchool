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
import { observationSchema, ObservationSchema } from "@/lib/formsValidationSchema";
import {
  createObservation,
  updateObservation,
} from "@/lib/actions/observationAction";
import {
  OBSERVATION_KINDS,
  OBSERVATION_KIND_LABELS,
} from "@/lib/observation";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

/**
 * W15 — saisie d'une observation (§2.3.7).
 * relatedData.students : élèves proposés (teacher : ceux de SES classes ;
 * staff : toute l'école) — revérifié côté serveur.
 * `sharedWithParents` décoché = observation CONFIDENTIELLE (jamais visible
 * du parent ni de l'élève, §2.7.8).
 */
const ObservationForm = ({
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
  } = useForm<ObservationSchema>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      studentId: data?.studentId,
      kind: data?.kind ?? "NEUTRAL",
      sharedWithParents: data?.sharedWithParents ?? true,
    },
  });

  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createObservation : updateObservation,
    { success: false, error: false, message: "" }
  );

  const [, startTransition] = useTransition();

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction(formData);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Observation ${type === "create" ? "enregistrée" : "modifiée"} !`);
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, type, router, setOpen]);

  const { students = [] } = relatedData ?? {};

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={
          type === "create"
            ? "Enregistrer une observation"
            : "Modifier une observation"
        }
        entity="Observation"
        onClose={() => setOpen(false)}
      />
      <FormSection>Observation</FormSection>
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

        {/* Élève — figé à la modification (le dossier ne change pas d'élève) */}
        <div className="flex flex-col gap-1.5 w-full md:w-2/5">
          <label className="text-xs font-medium text-gray-500">Élève</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky disabled:bg-gray-50 disabled:text-gray-500"
            {...register("studentId")}
            defaultValue={data?.studentId}
            disabled={type === "update"}
          >
            <option value="">-- Choisir --</option>
            {students.map(
              (s: { id: string; name: string; surname: string; className?: string | null }) => (
                <option value={s.id} key={s.id}>
                  {s.name} {s.surname}
                  {s.className ? ` (${s.className})` : ""}
                </option>
              )
            )}
          </select>
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5 w-full md:w-2/5">
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("kind")}
            defaultValue={data?.kind ?? "NEUTRAL"}
          >
            {OBSERVATION_KINDS.map((k) => (
              <option value={k} key={k}>
                {OBSERVATION_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          {errors.kind?.message && (
            <p className="text-xs text-red-400">
              {errors.kind.message.toString()}
            </p>
          )}
        </div>

        {/* Contenu */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-gray-500">
            Observation
          </label>
          <textarea
            placeholder="Comportement, participation, incident…"
            defaultValue={data?.content}
            rows={5}
            {...register("content")}
            className="ring-[1.5px] ring-gray-300 p-2.5 rounded-md w-full text-sm outline-none transition focus:ring-2 focus:ring-lamaSky"
          />
          {errors.content && (
            <p className="text-xs text-red-400">{errors.content.message}</p>
          )}
        </div>

        {/* Partage — décoché = confidentielle (§2.7.8) */}
        <label className="flex items-start gap-2 w-full text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            {...register("sharedWithParents")}
            className="mt-0.5 h-4 w-4 accent-sky-500"
          />
          <span>
            Partager avec les parents (et l&apos;élève)
            <span className="block text-xs text-gray-400">
              Décochée : observation confidentielle, visible uniquement de
              l&apos;équipe pédagogique. Une observation négative partagée
              notifie les tuteurs.
            </span>
          </span>
        </label>
      </div>

      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {(state as any).message || "Une erreur s'est produite"}
        </span>
      )}

      <FormFooter
        loading={loading}
        label={type === "create" ? "Enregistrer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default ObservationForm;
