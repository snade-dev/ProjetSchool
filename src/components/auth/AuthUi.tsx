"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Loader2,
  LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Coque commune : panneau de marque à gauche + carte formulaire à droite */
/* ------------------------------------------------------------------ */

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: GraduationCap, label: "Suivi des élèves, notes et bulletins" },
  { icon: BarChart3, label: "Statistiques et finance en temps réel" },
  { icon: FileText, label: "Documents PDF : bulletins, reçus, factures" },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      {/* Panneau de marque (desktop) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-lamaSkyLight via-white to-lamaPurpleLight">
        {/* Décor : cercles doux du design system */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-lamaSky opacity-40 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-lamaPurple opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-lamaYellow opacity-30 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LS_School"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="text-xl font-bold text-gray-800">LS_School</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-gray-800 leading-tight">
            La gestion de votre école,
            <br />
            simple et complète.
          </h1>
          <p className="mt-4 text-gray-500 text-sm max-w-md">
            Élèves, enseignants, notes, bulletins, présence et finance — tout
            votre établissement dans un seul tableau de bord.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Icon size={18} className="text-gray-700" />
                </span>
                <span className="text-sm text-gray-600">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-gray-400">
          © {new Date().getFullYear()} LS_School — Excellence et Innovation
        </p>
      </div>

      {/* Carte formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Image
              src="/logo.png"
              alt="LS_School"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-lg font-bold text-gray-800">LS_School</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/70 p-8">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Champ avec label + icône (+ œil pour les mots de passe)             */
/* ------------------------------------------------------------------ */

export function AuthField({
  id,
  name,
  label,
  type = "text",
  icon: Icon,
  placeholder,
  autoComplete,
  minLength,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  icon: LucideIcon;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && visible ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          id={id}
          name={name}
          type={effectiveType}
          required
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-md ring-[1.5px] ring-gray-300 bg-white p-2.5 pl-9 ${
            isPassword ? "pr-10" : "pr-3"
          } text-sm text-gray-800 placeholder:text-gray-300 outline-none transition focus:ring-2 focus:ring-lamaSky`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bouton de soumission avec état de chargement                        */
/* ------------------------------------------------------------------ */

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md p-2.5 transition"
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Un instant…" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Bannières erreur / succès pilotées par ?error= / ?success=          */
/* ------------------------------------------------------------------ */

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-credentials": "Email ou mot de passe incorrect.",
  "no-role":
    "Aucun rôle n'est attribué à ce compte. Contactez l'administration pour activer votre accès.",
  "missing-fields": "Veuillez remplir tous les champs.",
  "password-too-short": "Le mot de passe doit contenir au moins 8 caractères.",
  "password-mismatch": "Les deux mots de passe ne correspondent pas.",
  "email-exists": "Un compte existe déjà avec cette adresse email.",
  unknown: "Une erreur est survenue. Veuillez réessayer.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  "school-created":
    "Votre école est créée, avec 30 jours d'essai gratuit ! Connectez-vous avec votre e-mail pour configurer votre établissement.",
  "account-created":
    "Compte créé avec succès ! Connectez-vous. L'accès au tableau de bord sera ouvert dès qu'un rôle vous aura été attribué par l'administration.",
};

export function AuthMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const errorMsg = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.unknown : null;
  const successMsg = success ? SUCCESS_MESSAGES[success] : null;

  if (!errorMsg && !successMsg) return null;

  return (
    <div
      role="alert"
      className={`mb-4 flex items-start gap-2 rounded-md p-3 text-xs leading-relaxed ${
        errorMsg
          ? "bg-red-50 text-red-600 ring-1 ring-red-100"
          : "bg-green-50 text-green-700 ring-1 ring-green-100"
      }`}
    >
      {errorMsg ? (
        <AlertCircle size={16} className="shrink-0 mt-[1px]" />
      ) : (
        <CheckCircle2 size={16} className="shrink-0 mt-[1px]" />
      )}
      <span>{errorMsg ?? successMsg}</span>
    </div>
  );
}
