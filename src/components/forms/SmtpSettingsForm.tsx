"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Send } from "lucide-react";
import InputField from "../InputField";
import {
  smtpSettingsSchema,
  SmtpSettingsSchema,
} from "@/lib/formsValidationSchema";
import { sendTestEmail, updateSmtpSettings } from "@/lib/actions/emailAction";

/**
 * W13 — Section « Email (SMTP) » de /settings (admin).
 * Le mot de passe est WRITE-ONLY : le serveur ne le renvoie jamais, le champ
 * vide signifie « inchangé » (`hasPassword` n'indique que sa présence).
 * « Envoyer un email de test » utilise la config effective (école →
 * plateforme) vers l'adresse de l'admin connecté et affiche le résultat.
 */
const SmtpSettingsForm = ({
  data,
  hasPassword,
}: {
  data: {
    emailEnabled: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpFrom: string | null;
  };
  hasPassword: boolean;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SmtpSettingsSchema>({
    resolver: zodResolver(smtpSettingsSchema),
  });

  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const onSubmit = handleSubmit((formData) => {
    startSaving(async () => {
      const res = await updateSmtpSettings(
        { success: false, error: false },
        formData
      );
      if (res.success) {
        toast(res.message ?? "Configuration email enregistrée !");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur lors de l'enregistrement.");
      }
    });
  });

  const onTest = () => {
    setTestResult(null);
    startTesting(async () => {
      const res = await sendTestEmail();
      setTestResult({
        ok: res.success,
        message: res.message ?? (res.success ? "Email envoyé." : "Échec."),
      });
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-xs text-gray-400">
        Serveur d&apos;envoi des emails de notification (absences, bulletins,
        reçus de paiement). Sans configuration propre, le serveur de la
        plateforme est utilisé s&apos;il existe ; sinon les notifications
        restent uniquement dans l&apos;application — jamais bloquant.
      </p>

      <label className="flex w-max cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          {...register("emailEnabled")}
          defaultChecked={data.emailEnabled}
          className="h-4 w-4 accent-lamaSky"
        />
        Utiliser le serveur SMTP de l&apos;établissement ci-dessous
      </label>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Hôte SMTP"
          name="smtpHost"
          defaultValue={data.smtpHost ?? ""}
          register={register}
          error={errors?.smtpHost}
          inputProps={{ placeholder: "smtp.exemple.com" }}
        />
        <InputField
          label="Port"
          name="smtpPort"
          defaultValue={data.smtpPort?.toString() ?? ""}
          register={register}
          error={errors?.smtpPort as any}
          inputProps={{ placeholder: "587" }}
        />
        <InputField
          label="Utilisateur"
          name="smtpUser"
          defaultValue={data.smtpUser ?? ""}
          register={register}
          error={errors?.smtpUser}
        />
        <InputField
          label="Mot de passe"
          name="smtpPass"
          type="password"
          defaultValue=""
          register={register}
          error={errors?.smtpPass}
          inputProps={{
            placeholder: hasPassword
              ? "•••••• (laisser vide pour conserver)"
              : "Mot de passe SMTP",
            autoComplete: "new-password",
          }}
        />
        <InputField
          label="Adresse expéditeur"
          name="smtpFrom"
          defaultValue={data.smtpFrom ?? ""}
          register={register}
          error={errors?.smtpFrom}
          inputProps={{ placeholder: "no-reply@mon-ecole.com" }}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          disabled={saving}
          type="submit"
          className="bg-lamaSky text-white p-2 rounded-md disabled:bg-slate-500 w-max px-6"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled={testing}
          onClick={onTest}
          className="flex items-center gap-2 rounded-md bg-lamaPurpleLight p-2 px-4 text-sm text-gray-700 hover:bg-lamaPurple disabled:opacity-50"
          title="Envoie un email de test à votre adresse avec la configuration effective"
        >
          <Send size={14} />
          {testing ? "Envoi en cours…" : "Envoyer un email de test"}
        </button>
      </div>

      {testResult && (
        <p
          className={`text-sm ${
            testResult.ok ? "text-green-600" : "text-red-500"
          }`}
        >
          {testResult.message}
        </p>
      )}
    </form>
  );
};

export default SmtpSettingsForm;
