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
  contributionPaymentSchema,
  ContributionPaymentSchema,
} from "@/lib/formsValidationSchema";
import { createContributionPayment } from "@/lib/actions/contributionAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance";

const dateValue = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/**
 * X05 — Encaissement d'un versement de cotisation (§2.4).
 * Le montant proposé par défaut est le RESTE À VERSER de l'élève ; les
 * versements partiels comme les compléments volontaires restent possibles.
 */
const ContributionPaymentForm = ({
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
  } = useForm<ContributionPaymentSchema>({
    resolver: zodResolver(contributionPaymentSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(createContributionPayment, {
    success: false,
    error: false,
  });

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
      toast("Versement enregistré ! Le reçu est téléchargeable.");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : le registre est peut-être clôturé, ou une erreur est survenue."
      );
    }
  }, [state, router, setOpen]);

  const remaining = Math.max(0, (data?.expected ?? 0) - (data?.paid ?? 0));

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title="Enregistrer un versement"
        name={data?.studentName}
        code={data?.username}
        entity="Cotisation"
        onClose={() => setOpen(false)}
      />
      <FormSection>Versement</FormSection>

      <div className="rounded-md bg-lamaSkyLight/60 p-3 text-xs text-gray-600">
        Attendu : <strong>{(data?.expected ?? 0).toLocaleString("fr-FR")} FCFA</strong>{" "}
        · Déjà versé :{" "}
        <strong>{(data?.paid ?? 0).toLocaleString("fr-FR")} FCFA</strong> ·
        Reste : <strong>{remaining.toLocaleString("fr-FR")} FCFA</strong>
      </div>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Montant versé (FCFA)"
          name="amount"
          type="number"
          defaultValue={remaining > 0 ? remaining : ""}
          register={register}
          error={errors?.amount}
        />
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Méthode</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("method")}
            defaultValue="CASH"
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <InputField
          label="Date du versement"
          name="paidAt"
          type="date"
          defaultValue={dateValue(new Date())}
          register={register}
          error={errors?.paidAt as any}
        />
        <InputField
          label="Note (facultatif)"
          name="note"
          defaultValue=""
          register={register}
          error={errors?.note}
        />
      </div>

      <InputField
        label="Cotisation"
        name="contributionId"
        defaultValue={data?.contributionId}
        register={register}
        error={errors?.contributionId}
        hidden
      />
      <InputField
        label="Élève"
        name="studentId"
        defaultValue={data?.studentId}
        register={register}
        error={errors?.studentId}
        hidden
      />

      <FormFooter
        loading={loading}
        label="Encaisser"
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default ContributionPaymentForm;
