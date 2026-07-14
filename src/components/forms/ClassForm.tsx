"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useActionState,
  useTransition,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ClassSchema, classSchema } from "@/lib/formsValidationSchema";
import { createClass, updateClass } from "@/lib/actions";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const ClassForm = ({
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
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
  });

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE

  const [state, formAction] = useActionState(
    type === "create" ? createClass : updateClass,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`La classe a été ${type === "create" ? "créée" : "mise à jour"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { teachers, levels } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create" ? "Créer une nouvelle classe" : "Modifier la classe"}
        entity="Classe"
        onClose={() => setOpen(false)}
      />

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Classe"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Capacité"
          name="capacity"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
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
        {/* W02 — niveau de la classe (§2.1.4), obligatoire à la saisie */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Niveau</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("levelId")}
            defaultValue={data?.levelId ?? ""}
          >
            <option value="" disabled>
              Choisir un niveau…
            </option>
            {(levels ?? []).map(
              (level: { id: number; name: string; cycle: string | null }) => (
                <option value={level.id} key={level.id}>
                  {level.name}
                  {level.cycle ? ` (${level.cycle})` : ""}
                </option>
              )
            )}
          </select>
          {(levels ?? []).length === 0 && (
            <p className="text-xs text-amber-600">
              Aucun niveau — créez-en d&apos;abord dans École → Niveaux.
            </p>
          )}
          {errors.levelId?.message && (
            <p className="text-xs text-red-400 font-bold">
              {errors.levelId.message.toString()}
            </p>
          )}
        </div>
        {/* V01 — régime d'évaluation : détermine les périodes (notes, bulletins) */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">
            Régime d&apos;évaluation
          </label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("evaluationSystem")}
            defaultValue={data?.evaluationSystem ?? "TRIMESTER"}
          >
            <option value="TRIMESTER">Trimestres (3 périodes/an)</option>
            <option value="MONTHLY">Compositions mensuelles</option>
          </select>
          {errors.evaluationSystem?.message && (
            <p className="text-xs text-red-400 font-bold">
              {errors.evaluationSystem.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Superviseur</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("supervisorId")}
            defaultValue={data?.teachers}
          >
            {teachers.map(
              (teacher: { id: string; name: string; surname: string }) => (
                <option
                  value={teacher.id}
                  key={teacher.id}
                  selected={data && teacher.id === data.supervisorId}
                >
                  {teacher.name + " " + teacher.surname}
                </option>
              )
            )}
          </select>
          {errors.supervisorId?.message && (
            <p className="text-xs text-red-400 font-bold">
              {errors.supervisorId.message.toString()}
            </p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message ? state.message : "Une erreur c&apos;est produite!"}
        </span>
      )}

      <FormFooter
        loading={isPending}
        label={type === "create" ? "Créer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default ClassForm;
