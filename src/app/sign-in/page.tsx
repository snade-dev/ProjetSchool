"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { signIn } from "@/lib/authAction";
import {
  AuthField,
  AuthMessage,
  AuthShell,
  SubmitButton,
} from "@/components/auth/AuthUi";

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour !"
      subtitle="Connectez-vous à votre espace LS_School."
    >
      <Suspense fallback={null}>
        <AuthMessage />
      </Suspense>

      <form className="flex flex-col gap-4" action={signIn}>
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
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="mt-2">
          <SubmitButton label="Se connecter" />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Votre identifiant vous est remis par votre établissement.
      </p>
      <p className="mt-2 text-center text-sm text-gray-400">
        Votre école n&apos;est pas encore sur la plateforme ?{" "}
        <Link
          href="/register-school"
          className="font-semibold text-blue-500 hover:text-blue-600"
        >
          Créer mon école
        </Link>
      </p>
    </AuthShell>
  );
}
