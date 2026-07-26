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
import {
  mealPlanSchema,
  MealPlanSchema,
} from "@/lib/formsValidationSchema";
import {
  createMealPlan,
  updateMealPlan,
} from "@/lib/actions/canteenAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

/**
 * X01 — Formule de restauration (§2.5). Le forfait est facturé sur les factures
 * de l'élève (X03) ; le prix unitaire (facultatif) sert aux repas à l'unité
 * pointés au réfectoire (X02).
 */
const MealPlanForm = ({
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
  } = useForm<MealPlanSchema>({
    resolver: zodResolver(mealPlanSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createMealPlan : updateMealPlan,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction(formData);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(`La formule a été ${type === "create" ? "créée" : "modifiée"} !`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : ce nom de formule existe déjà cette année, ou une erreur est survenue."
      );
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={
          type === "create"
            ? "Ajouter une formule de cantine"
            : "Modifier la formule"
        }
        entity="Cantine"
        onClose={() => setOpen(false)}
      />
      <FormSection>Informations de la formule</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom de la formule"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Montant du forfait (FCFA)"
          name="amount"
          type="number"
          defaultValue={data?.amount}
          register={register}
          error={errors?.amount}
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">
            Périodicité
          </label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("period")}
            defaultValue={data?.period ?? "MONTHLY"}
          >
            <option value="MONTHLY">Mensuel</option>
            <option value="YEARLY">Annuel</option>
            <option value="ONE_TIME">Unique</option>
          </select>
          {errors.period?.message && (
            <p className="text-xs text-red-400">
              {errors.period.message.toString()}
            </p>
          )}
        </div>
        <InputField
          label="Prix d'un repas à l'unité (FCFA)"
          name="unitPrice"
          type="number"
          defaultValue={data?.unitPrice ?? ""}
          register={register}
          error={errors?.unitPrice as any}
        />
        <div className="w-full">
          <p className="text-[11.5px] text-gray-400">
            Le prix unitaire est facultatif : laissez-le vide si l&apos;école ne
            sert pas de repas hors forfait. Il sert à facturer les repas
            exceptionnels pointés au réfectoire.
          </p>
        </div>
        <InputField
          label="Description (facultatif)"
          name="description"
          defaultValue={data?.description ?? ""}
          register={register}
          error={errors?.description}
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Statut</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("active")}
            defaultValue={data ? String(data.active) : "true"}
          >
            <option value="true">Proposée</option>
            <option value="false">Retirée</option>
          </select>
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

      <FormFooter
        loading={loading}
        label={type === "create" ? "Créer" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default MealPlanForm;
