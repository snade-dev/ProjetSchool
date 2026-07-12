"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { registerSchool } from "@/lib/actions/registerSchoolAction";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  SubmitButton,
} from "@/components/auth/AuthUi";

/**
 * V07 — Inscription self-service d'un établissement : crée l'école, son
 * compte administrateur et l'essai gratuit de 30 jours.
 */
export default function RegisterSchoolPage() {
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <AuthShell
      title="Créer mon école"
      subtitle="Votre établissement en ligne en 2 minutes — essai gratuit de 30 jours, sans carte bancaire."
    >
      <Suspense fallback={null}>
        <AuthMessage />
      </Suspense>

      {clientError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100"
        >
          <AlertCircle size={16} className="mt-[1px] shrink-0" />
          <span>{clientError}</span>
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        action={registerSchool}
        onSubmit={(e) => {
          const form = e.currentTarget;
          const password = (
            form.elements.namedItem("password") as HTMLInputElement
          )?.value;
          const confirm = (
            form.elements.namedItem("confirmPassword") as HTMLInputElement
          )?.value;
          if (password !== confirm) {
            e.preventDefault();
            setClientError("Les deux mots de passe ne correspondent pas.");
            return;
          }
          setClientError(null);
        }}
      >
        <AuthField
          id="schoolName"
          name="schoolName"
          label="Nom de l'établissement"
          icon={Building2}
          placeholder="Lycée Exemple de Bamako"
          autoComplete="organization"
        />
        <AuthField
          id="name"
          name="name"
          label="Votre nom complet (direction)"
          icon={User}
          placeholder="Prénom Nom"
          autoComplete="name"
        />
        <AuthField
          id="email"
          name="email"
          label="Adresse email"
          type="email"
          icon={Mail}
          placeholder="direction@votre-ecole.ml"
          autoComplete="email"
        />
        <AuthField
          id="password"
          name="password"
          label="Mot de passe"
          type="password"
          icon={Lock}
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          minLength={8}
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          icon={ShieldCheck}
          placeholder="Retapez le mot de passe"
          autoComplete="new-password"
          minLength={8}
        />

        <div className="mt-2">
          <SubmitButton label="Créer mon école — essai 30 jours" />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Déjà un établissement sur la plateforme ?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-blue-500 hover:text-blue-600"
        >
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
