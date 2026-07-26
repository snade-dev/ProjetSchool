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
  annualAssessmentSchema,
  AnnualAssessmentSchema,
  CONDUCT_VALUES,
  WORK_APPRECIATION_VALUES,
} from "@/lib/formsValidationSchema";
import { saveAnnualAssessment } from "@/lib/actions/annualAction";
import { DrawerHeader, FormFooter, FormSection } from "../form/DrawerUi";

/**
 * X07 — Bilan de fin d'année d'un élève. Une seule saisie alimente le bulletin
 * annuel, le certificat de transfert (X08) et le passage d'année (W04).
 */
const AnnualAssessmentForm = ({
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
  } = useForm<AnnualAssessmentSchema>({
    resolver: zodResolver(annualAssessmentSchema),
  });

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(saveAnnualAssessment, {
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
      toast("Bilan de fin d'année enregistré !");
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(
        "Erreur : vous n'êtes peut-être pas titulaire de cette classe."
      );
    }
  }, [state, router, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <DrawerHeader
        title="Bilan de fin d'année"
        name={data?.studentName}
        code={data?.username}
        entity={data?.className}
        onClose={() => setOpen(false)}
      />

      <div className="rounded-md bg-lamaSkyLight/60 p-3 text-xs text-gray-600">
        Ces informations alimentent le <strong>bulletin annuel</strong>, le{" "}
        <strong>certificat de transfert</strong> et l&apos;assistant de{" "}
        <strong>passage d&apos;année</strong>.
      </div>

      <FormSection>Appréciation</FormSection>
      <div className="flex justify-between flex-wrap gap-4">
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
        <div className="flex flex-col gap-1.5 w-full md:w-1/3">
          <label className="text-xs font-medium text-gray-500">
            Travail (certificat de transfert)
          </label>
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
        <InputField
          label="Retards de l'année"
          name="lateCount"
          type="number"
          defaultValue={data?.lateCount ?? ""}
          register={register}
          error={errors?.lateCount as any}
        />
        <div className="w-full">
          <p className="text-[11.5px] text-gray-400">
            Les <strong>absences</strong> sont comptées automatiquement depuis
            l&apos;appel ; les <strong>retards</strong> se saisissent ici (ils ne
            sont pas relevés à l&apos;appel).
          </p>
        </div>
      </div>

      <FormSection>Décision et observations</FormSection>
      <div className="flex flex-col gap-4">
        <InputField
          label="Décision du conseil des maîtres"
          name="annualDecision"
          defaultValue={data?.annualDecision ?? ""}
          register={register}
          error={errors?.annualDecision}
          inputProps={{ placeholder: "Passe en CP2" }}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">
            Observations portées au bulletin
          </label>
          <textarea
            rows={4}
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            {...register("annualObservation")}
            defaultValue={data?.annualObservation ?? ""}
          />
        </div>
      </div>

      <InputField
        label="Inscription"
        name="enrollmentId"
        defaultValue={data?.enrollmentId}
        register={register}
        error={errors?.enrollmentId}
        hidden
      />

      <FormFooter
        loading={loading}
        label="Enregistrer"
        onCancel={() => setOpen(false)}
      />
    </form>
  );
};

export default AnnualAssessmentForm;
