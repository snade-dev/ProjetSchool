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
  canteenSubscriptionSchema,
  CanteenSubscriptionSchema,
} from "@/lib/formsValidationSchema";
import {
  createCanteenSubscription,
  updateCanteenSubscription,
} from "@/lib/actions/canteenAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

/** "YYYY-MM-DD" attendu par <input type="date"> (null-safe). */
const dateValue = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/**
 * X01 — Abonnement cantine d'un élève (§2.5). Un seul abonnement par élève et
 * par année : changer de formule = modifier cette ligne. Les dates bornent la
 * facturation du forfait (X03).
 */
const CanteenSubscriptionForm = ({
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
  } = useForm<CanteenSubscriptionSchema>({
    resolver: zodResolver(canteenSubscriptionSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(
    type === "create" ? createCanteenSubscription : updateCanteenSubscription,
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
      toast(
        `L'abonnement a été ${type === "create" ? "créé" : "modifié"} !`
      );
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : cet élève a déjà un abonnement cantine cette année, ou une erreur est survenue."
      );
    }
  }, [state, router, type, setOpen]);

  const students: {
    id: string;
    name: string;
    surname: string;
    className: string | null;
  }[] = relatedData?.students ?? [];
  const mealPlans: { id: number; name: string; amount: number }[] =
    relatedData?.mealPlans ?? [];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={
          type === "create"
            ? "Inscrire un élève à la cantine"
            : "Modifier l'abonnement"
        }
        entity="Cantine"
        onClose={() => setOpen(false)}
      />
      <FormSection>Abonnement</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-1.5 w-full md:w-2/5">
          <label className="text-xs font-medium text-gray-500">Élève</label>
          {/* L'élève d'un abonnement existant n'est pas transférable : on
              résilie et on en crée un autre (traçabilité de l'audit). Le champ
              reste alors en lecture seule, la valeur étant portée par le
              champ caché enregistré ci-dessous. */}
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky disabled:bg-gray-100"
            {...(type === "update" ? {} : register("studentId"))}
            defaultValue={data?.studentId}
            disabled={type === "update"}
          >
            <option value="">— Choisir un élève —</option>
            {students.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name} {s.surname}
                {s.className ? ` — ${s.className}` : ""}
              </option>
            ))}
          </select>
          {type === "update" && (
            <input
              type="hidden"
              {...register("studentId")}
              defaultValue={data?.studentId}
            />
          )}
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-2/5">
          <label className="text-xs font-medium text-gray-500">Formule</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("mealPlanId")}
            defaultValue={data?.mealPlanId}
          >
            <option value="">— Choisir une formule —</option>
            {mealPlans.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} — {p.amount.toLocaleString("fr-FR")} FCFA
              </option>
            ))}
          </select>
          {errors.mealPlanId?.message && (
            <p className="text-xs text-red-400">
              {errors.mealPlanId.message.toString()}
            </p>
          )}
        </div>
        <InputField
          label="Début de prise en charge"
          name="startDate"
          type="date"
          defaultValue={dateValue(data?.startDate) || dateValue(new Date())}
          register={register}
          error={errors?.startDate as any}
        />
        <InputField
          label="Fin (facultatif)"
          name="endDate"
          type="date"
          defaultValue={dateValue(data?.endDate)}
          register={register}
          error={errors?.endDate as any}
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Statut</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("status")}
            defaultValue={data?.status ?? "ACTIVE"}
          >
            <option value="ACTIVE">Actif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="ENDED">Résilié</option>
          </select>
        </div>
        <InputField
          label="Note (facultatif)"
          name="note"
          defaultValue={data?.note ?? ""}
          register={register}
          error={errors?.note}
        />
        <div className="w-full">
          <p className="text-[11.5px] text-gray-400">
            Seuls les abonnements <strong>actifs</strong> sont facturés et
            apparaissent comme couverts au pointage du réfectoire.
          </p>
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
        label={type === "create" ? "Inscrire" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default CanteenSubscriptionForm;
