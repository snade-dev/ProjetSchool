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
  eventContributionSchema,
  EventContributionSchema,
} from "@/lib/formsValidationSchema";
import { upsertEventContribution } from "@/lib/actions/contributionAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const dateValue = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/**
 * X05 — Barème de cotisation d'un événement (§2.4). Un seul barème par
 * événement : créer et modifier passent par la même action (upsert).
 * Le périmètre n'est pas saisi ici — c'est celui de l'événement (sa classe,
 * ou toute l'école si l'événement n'en cible aucune).
 */
const EventContributionForm = ({
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
  } = useForm<EventContributionSchema>({
    resolver: zodResolver(eventContributionSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(upsertEventContribution, {
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
      toast(
        type === "create"
          ? "Cotisation ouverte ! Les tuteurs ont été prévenus."
          : "Barème modifié !"
      );
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error("Erreur lors de l'enregistrement de la cotisation.");
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title={
          type === "create"
            ? "Ouvrir une cotisation"
            : "Modifier le barème de la cotisation"
        }
        name={data?.eventTitle}
        entity="Cotisation"
        onClose={() => setOpen(false)}
      />
      <FormSection>Barème</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Montant attendu par élève (FCFA)"
          name="amount"
          type="number"
          defaultValue={data?.amount}
          register={register}
          error={errors?.amount}
        />
        <InputField
          label="Date limite (facultatif)"
          name="dueDate"
          type="date"
          defaultValue={dateValue(data?.dueDate)}
          register={register}
          error={errors?.dueDate as any}
        />
        <InputField
          label="Note (facultatif)"
          name="note"
          defaultValue={data?.note ?? ""}
          register={register}
          error={errors?.note}
        />
        <div className="w-full">
          <p className="text-[11.5px] text-gray-400">
            Les élèves concernés sont ceux du périmètre de l&apos;événement
            {data?.className
              ? ` : la classe ${data.className}.`
              : " : toute l'école."}{" "}
            Les versements partiels sont acceptés.
          </p>
        </div>
      </div>

      <InputField
        label="Événement"
        name="eventId"
        defaultValue={data?.eventId}
        register={register}
        error={errors?.eventId}
        hidden
      />

      <FormFooter
        loading={loading}
        label={type === "create" ? "Ouvrir la cotisation" : "Modifier"}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default EventContributionForm;
