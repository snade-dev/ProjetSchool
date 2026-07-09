"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  schoolSettingsSchema,
  SchoolSettingsSchema,
} from "@/lib/formsValidationSchema";
import { upsertSchoolSettings } from "@/lib/actions/settingsAction";

const SchoolSettingsForm = ({ data }: { data?: any }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSettingsSchema>({
    resolver: zodResolver(schoolSettingsSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(upsertSchoolSettings, {
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
      toast("Paramètres de l'établissement enregistrés !");
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Nom de l'établissement"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Adresse"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors?.address}
        />
        <InputField
          label="Téléphone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors?.phone}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label="Logo (URL)"
          name="logo"
          defaultValue={data?.logo}
          register={register}
          error={errors?.logo}
        />
        <InputField
          label="Devise"
          name="currency"
          defaultValue={data?.currency ?? "FCFA"}
          register={register}
          error={errors?.currency}
        />
        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">
            Pied de page (factures / reçus)
          </label>
          <textarea
            {...register("legalFooter")}
            defaultValue={data?.legalFooter}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            rows={2}
          />
          {errors.legalFooter?.message && (
            <p className="text-xs text-red-400">
              {errors.legalFooter.message.toString()}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <span className="text-red-500 text-sm">
          Une erreur est survenue lors de l&apos;enregistrement.
        </span>
      )}

      <button
        disabled={loading}
        type="submit"
        className="bg-lamaSky text-white p-2 rounded-md disabled:bg-slate-500 w-max px-6"
      >
        Enregistrer
      </button>
    </form>
  );
};

export default SchoolSettingsForm;
