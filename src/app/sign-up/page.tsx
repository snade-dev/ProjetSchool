"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { AlertCircle, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { signUp } from "@/lib/authAction";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  SubmitButton,
} from "@/components/auth/AuthUi";

export default function RegisterPage() {
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Rejoignez l'espace LS_School. Votre rôle sera attribué par l'administration."
    >
      <Suspense fallback={null}>
        <AuthMessage />
      </Suspense>

      {clientError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100"
        >
          <AlertCircle size={16} className="shrink-0 mt-[1px]" />
          <span>{clientError}</span>
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        action={signUp}
        onSubmit={(e) => {
          // Contrôle instantané côté client (revalidé côté serveur).
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
          id="name"
          name="name"
          label="Nom complet"
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
          placeholder="vous@exemple.com"
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
          <SubmitButton label="Créer mon compte" />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Déjà un compte ?{" "}
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
