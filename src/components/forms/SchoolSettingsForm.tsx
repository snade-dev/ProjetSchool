"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import UploadField from "../UploadField";
import { useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  schoolSettingsSchema,
  SchoolSettingsSchema,
} from "@/lib/formsValidationSchema";
import { upsertSchoolSettings } from "@/lib/actions/settingsAction";

/** Palette par défaut de l'application (doit refléter globals.css). */
const DEFAULT_THEME = {
  themePrimary: "#A6D8F7",
  themeSecondary: "#B5A4F1",
  themeAccent: "#F1D76D",
} as const;

const SchoolSettingsForm = ({ data }: { data?: any }) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SchoolSettingsSchema>({
    resolver: zodResolver(schoolSettingsSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(data?.logo);

  const [state, formAction] = useActionState(upsertSchoolSettings, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    setLoading(true);
    startTransition(() => {
      formAction({ ...formData, logo: logoUrl });
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
        <div className="flex flex-col gap-1.5 w-full md:w-1/4">
          <label className="text-xs font-medium text-gray-500">Logo</label>
          <UploadField
            label="Téléverser le logo"
            value={logoUrl}
            onChange={setLogoUrl}
          />
        </div>
        <InputField
          label="Devise"
          name="currency"
          defaultValue={data?.currency ?? "FCFA"}
          register={register}
          error={errors?.currency}
        />
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-gray-500">
            Pied de page (factures / reçus)
          </label>
          <textarea
            {...register("legalFooter")}
            defaultValue={data?.legalFooter}
            className="w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-lamaSky"
            rows={2}
          />
          {errors.legalFooter?.message && (
            <p className="text-xs text-red-400">
              {errors.legalFooter.message.toString()}
            </p>
          )}
        </div>
      </div>

      {/* X08 — En-tête des documents officiels : ces champs alimentent le
          certificat de transfert et le bulletin annuel (tutelle à gauche,
          devise de la République à droite, signataire en bas). */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Documents officiels
        </h2>
        <p className="text-[11.5px] text-gray-400">
          Ces mentions apparaissent en en-tête et en signature du certificat de
          transfert et du bulletin annuel. Laissez vide ce qui ne s&apos;applique
          pas à votre établissement.
        </p>
        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Ministère de tutelle"
            name="ministry"
            defaultValue={data?.ministry ?? ""}
            register={register}
            error={errors?.ministry}
            inputProps={{ placeholder: "MINISTERE DE L'EDUCATION NATIONALE" }}
          />
          <InputField
            label="Académie / CAP"
            name="academy"
            defaultValue={data?.academy ?? ""}
            register={register}
            error={errors?.academy}
            inputProps={{ placeholder: "CAP DE BAGUINEDA" }}
          />
          <InputField
            label="République (1re ligne)"
            name="countryLine1"
            defaultValue={data?.countryLine1 ?? ""}
            register={register}
            error={errors?.countryLine1}
            inputProps={{ placeholder: "REPUBLIQUE DU MALI" }}
          />
          <InputField
            label="Devise (2e ligne)"
            name="countryLine2"
            defaultValue={data?.countryLine2 ?? ""}
            register={register}
            error={errors?.countryLine2}
            inputProps={{ placeholder: "Un Peuple – Un But – Une Foi" }}
          />
          <InputField
            label="Ville (« Fait à … »)"
            name="city"
            defaultValue={data?.city ?? ""}
            register={register}
            error={errors?.city}
          />
          <InputField
            label="Nom du signataire"
            name="directorName"
            defaultValue={data?.directorName ?? ""}
            register={register}
            error={errors?.directorName}
            inputProps={{ placeholder: "MARIKO Aminata" }}
          />
          <InputField
            label="Qualité du signataire"
            name="directorTitle"
            defaultValue={data?.directorTitle ?? ""}
            register={register}
            error={errors?.directorTitle}
            inputProps={{ placeholder: "La Directrice" }}
          />
        </div>
      </div>

      {/* Thème de l'application : couleurs adaptées à l'établissement */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Thème de l&apos;application
          </h2>
          <button
            type="button"
            onClick={() => {
              setValue("themePrimary", DEFAULT_THEME.themePrimary);
              setValue("themeSecondary", DEFAULT_THEME.themeSecondary);
              setValue("themeAccent", DEFAULT_THEME.themeAccent);
            }}
            className="text-xs text-blue-500 hover:text-blue-600"
          >
            Réinitialiser la palette par défaut
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Ces couleurs personnalisent l&apos;interface (menu, cartes, badges,
          graphiques) aux couleurs de votre établissement. Les variantes
          claires sont dérivées automatiquement.
        </p>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Couleur principale</label>
            <input
              type="color"
              {...register("themePrimary")}
              defaultValue={data?.themePrimary ?? DEFAULT_THEME.themePrimary}
              className="h-10 w-20 cursor-pointer rounded-md ring-[1.5px] ring-gray-300 bg-white p-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Couleur secondaire</label>
            <input
              type="color"
              {...register("themeSecondary")}
              defaultValue={data?.themeSecondary ?? DEFAULT_THEME.themeSecondary}
              className="h-10 w-20 cursor-pointer rounded-md ring-[1.5px] ring-gray-300 bg-white p-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Couleur d&apos;accent</label>
            <input
              type="color"
              {...register("themeAccent")}
              defaultValue={data?.themeAccent ?? DEFAULT_THEME.themeAccent}
              className="h-10 w-20 cursor-pointer rounded-md ring-[1.5px] ring-gray-300 bg-white p-1"
            />
          </div>
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
