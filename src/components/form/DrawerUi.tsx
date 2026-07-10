"use client";

import { Loader2, X } from "lucide-react";

// S21 — piste A « Le Registre » : briques partagées des formulaires en
// panneau latéral. L'en-tête est teinté par le thème de l'établissement
// (classe .drawer-hero-bg, dérivée de --lama-sky), le pied d'action reste
// collé en bas du panneau (sticky dans le scroll du drawer).

/**
 * En-tête « fiche du registre » : titre (ou identité vivante), matricule,
 * rôle, cachet de l'école en filigrane. Déborde du padding du drawer
 * (marges négatives) pour un bandeau pleine largeur.
 */
export function DrawerHeader({
  title,
  name,
  code,
  entity,
  onClose,
}: {
  /** Titre statique ("Créer une matière") — remplacé par `name` s'il est saisi */
  title: string;
  /** Identité vivante (ex. « Aminata Keïta ») affichée dès qu'elle existe */
  name?: string;
  /** Ligne secondaire en mono : matricule / identifiant */
  code?: string;
  /** Chip de rôle/entité : « Enseignant », « Matière »… */
  entity?: string;
  onClose?: () => void;
}) {
  const displayName = name?.trim();
  const initials =
    displayName
      ?.split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? null;

  return (
    <div className="drawer-hero-bg relative -mx-6 -mt-6 mb-5 overflow-hidden px-6 py-5 text-white">
      {/* cachet de l'école en filigrane */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-2 top-1/2 grid h-24 w-24 -translate-y-1/2 rotate-[-14deg] place-items-center rounded-full border-2 border-dashed border-white/25 p-2 text-center text-[8px] uppercase leading-relaxed tracking-[0.18em] text-white/40"
      >
        LS School · fiche
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 text-white/70 transition hover:text-white"
        >
          <X size={17} />
        </button>
      )}
      <div className="flex items-center gap-4">
        {initials && (
          <div className="grid h-12 w-12 flex-none place-items-center rounded-full border-2 border-dashed border-white/50 bg-white/15 text-base font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-lg font-bold leading-snug">
            {displayName || title}
          </div>
          {displayName && (
            <div className="text-xs text-white/75">{title}</div>
          )}
          {code && (
            <div className="font-mono text-[11px] tracking-[0.08em] text-white/80">
              {code}
            </div>
          )}
          {entity && (
            <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
              {entity}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Intitulé de section : petites majuscules couleur thème + filet. */
export function FormSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-theme-deep mt-1 flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.16em]">
      {children}
      <span className="h-px flex-1 bg-gray-200" aria-hidden />
    </div>
  );
}

/**
 * Pied d'action collé en bas du panneau : Annuler + action principale
 * avec état de chargement.
 */
export function FormFooter({
  loading,
  label,
  onCancel,
}: {
  loading?: boolean;
  label: string;
  onCancel?: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-2 flex gap-3 border-t border-gray-200 bg-gray-50/95 px-6 py-4 backdrop-blur-sm">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border-[1.5px] border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-500 transition hover:bg-gray-100"
        >
          Annuler
        </button>
      )}
      <button
        type="submit"
        disabled={loading}
        className="drawer-hero-bg flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? "Un instant…" : label}
      </button>
    </div>
  );
}

/** Chips cochables (remplace les <select multiple>). */
export function ChipsField({
  label,
  options,
  values,
  onToggle,
  error,
  hint,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onToggle: (value: string) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt.value)}
              className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-xs transition ${
                on
                  ? "border-lamaSky bg-lamaSkyLight/60 font-semibold text-gray-900"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {on ? "✓ " : ""}
              {opt.label}
            </button>
          );
        })}
      </div>
      {hint && !error && <p className="text-[11.5px] text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
