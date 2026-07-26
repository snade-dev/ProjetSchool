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
  transferCertificateSchema,
  TransferCertificateSchema,
  CONDUCT_VALUES,
  WORK_APPRECIATION_VALUES,
} from "@/lib/formsValidationSchema";
import { issueTransferCertificate } from "@/lib/actions/transferAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

const dateValue = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/**
 * X08 — Émission d'un certificat de transfert (§2.1.3).
 * Les valeurs sont pré-remplies par le bilan annuel de l'élève ; l'émission
 * FIGE moyenne, rang, classe et dates dans le document, et marque
 * l'inscription de l'année comme TRANSFERRED.
 */
const TransferCertificateForm = ({
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
  } = useForm<TransferCertificateSchema>({
    resolver: zodResolver(transferCertificateSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(issueTransferCertificate, {
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
      toast("Certificat de transfert émis ! Il est téléchargeable en PDF.");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : l'élève doit être inscrit sur l'année active pour recevoir un certificat."
      );
    }
  }, [state, router, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title="Émettre un certificat de transfert"
        name={data?.studentName}
        code={data?.username}
        entity={data?.className}
        onClose={() => setOpen(false)}
      />

      <div className="rounded-md bg-lamaYellowLight p-3 text-xs text-yellow-800">
        L&apos;émission <strong>fige</strong> la moyenne annuelle, le rang et les
        dates de fréquentation dans le document, et marque l&apos;inscription de
        l&apos;année comme <strong>transférée</strong>.
        {data?.annualAverage == null && (
          <>
            {" "}
            Aucune moyenne annuelle n&apos;est disponible : générez d&apos;abord
            les bulletins de période, sinon le certificat sortira sans moyenne.
          </>
        )}
      </div>

      <FormSection>Motif et décision</FormSection>
      <div className="flex flex-col gap-4">
        <InputField
          label="Motif de transfert"
          name="reason"
          defaultValue=""
          register={register}
          error={errors?.reason}
          inputProps={{ placeholder: "sur demande des parents" }}
        />
        <InputField
          label="Décision du conseil des maîtres"
          name="decision"
          defaultValue={data?.annualDecision ?? ""}
          register={register}
          error={errors?.decision}
          inputProps={{ placeholder: "passe en 5ème Année" }}
        />
      </div>

      <FormSection>Appréciations portées au certificat</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-1.5 w-full md:w-1/3">
          <label className="text-xs font-medium text-gray-500">Travail</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("workAppreciation")}
            defaultValue={data?.workAppreciation ?? ""}
          >
            <option value="">— Non renseignée —</option>
            {WORK_APPRECIATION_VALUES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-1/3">
          <label className="text-xs font-medium text-gray-500">Conduite</label>
          <select
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("conduct")}
            defaultValue={data?.conduct ?? ""}
          >
            <option value="">— Non renseignée —</option>
            {CONDUCT_VALUES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <InputField
          label="Dernier jour de fréquentation"
          name="attendedTo"
          type="date"
          defaultValue={dateValue(data?.yearEndDate)}
          register={register}
          error={errors?.attendedTo as any}
        />
        <div className="w-full">
          <p className="text-[11.5px] text-gray-400">
            Laissez la date vide pour retenir la fin de l&apos;année scolaire.
            Le début de fréquentation est déduit de la plus ancienne inscription
            de l&apos;élève.
          </p>
        </div>
      </div>

      <InputField
        label="Élève"
        name="studentId"
        defaultValue={data?.studentId}
        register={register}
        error={errors?.studentId}
        hidden
      />
      {data?.attestationId && (
        <InputField
          label="Demande"
          name="attestationId"
          defaultValue={data.attestationId}
          register={register}
          error={errors?.attestationId}
          hidden
        />
      )}

      <FormFooter
        loading={loading}
        label="Émettre le certificat"
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default TransferCertificateForm;
