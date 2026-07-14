"use client";

// W02 — formulaire de création/édition d'un niveau scolaire (§2.1.4).

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
import { LevelSchema, levelSchema } from "@/lib/formsValidationSchema";
import { createLevel, updateLevel } from "@/lib/actions/levelAction";
import { DrawerHeader, FormFooter } from "../form/DrawerUi";

const CYCLES = ["Préscolaire", "Primaire", "Collège", "Lycée"];

const LevelForm = ({
  type,
  data,
  setOpen,
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
  } = useForm<LevelSchema>({
    resolver: zodResolver(levelSchema),
  });

  const [state, formAction] = useActionState(
    type === "create" ? createLevel : updateLevel,
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
      toast(`Le niveau a été ${type === "create" ? "créé" : "mis à jour"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={type === "create" ? "Créer un niveau" : "Modifier le niveau"}
        entity="Niveau"
        onClose={() => setOpen(false)}
      />

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom du niveau (ex. « 6ème »)"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Ordre hiérarchique"
          name="order"
          type="number"
          defaultValue={data?.order ?? 1}
          register={register}
          error={errors?.order}
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
        {/* Cycle libre : liste indicative + saisie manuelle possible */}
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">
            Cycle (optionnel)
          </label>
          <input
            list="level-cycles"
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("cycle")}
            defaultValue={data?.cycle ?? ""}
            placeholder="Primaire, Collège…"
          />
          <datalist id="level-cycles">
            {CYCLES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.cycle?.message && (
            <p className="text-xs text-red-400 font-bold">
              {errors.cycle.message.toString()}
            </p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
          {state.message ? state.message : "Une erreur s'est produite!"}
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

export default LevelForm;
