"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { switchSpace } from "@/lib/actions/membershipAction";

export type SwitcherSpace = {
  id: number;
  schoolName: string;
  role: string;
  roleLabel: string;
  isCurrent: boolean;
};

/**
 * W06 — Bascule d'espace depuis le header (§2.7.10) : visible uniquement si
 * le compte a plusieurs memberships sélectionnables. Le clic appelle la
 * server action switchSpace qui met à jour le contexte actif puis redirige
 * vers le dashboard du rôle choisi (la session better-auth relit le User en
 * base à chaque requête : pas de reconnexion nécessaire).
 */
const SpaceSwitcher = ({ spaces }: { spaces: SwitcherSpace[] }) => {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (spaces.length < 2) return null;

  const current = spaces.find((s) => s.isCurrent);

  const choose = (space: SwitcherSpace) => {
    if (space.isCurrent || pending) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      // switchSpace termine par redirect() → navigation gérée par Next.
      await switchSpace(space.id);
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        title="Changer d'espace"
        className="flex max-w-[220px] items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs ring-[1.5px] ring-gray-200 transition hover:ring-lamaSky disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} className="flex-none animate-spin text-gray-500" />
        ) : (
          <Building2 size={14} className="flex-none text-gray-500" />
        )}
        <span className="hidden min-w-0 flex-col items-start md:flex">
          <span className="w-full truncate font-medium leading-tight text-gray-700">
            {current?.schoolName ?? "Espace"}
          </span>
          <span className="text-[10px] leading-tight text-gray-400">
            {pending ? "Bascule…" : current?.roleLabel ?? ""}
          </span>
        </span>
        <ChevronDown
          size={13}
          className={`flex-none text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-900/10"
        >
          <p className="px-4 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Changer d&apos;espace
          </p>
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => choose(space)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 disabled:opacity-60"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-gray-700">
                  {space.schoolName}
                </span>
                <span className="text-[10px] text-gray-400">{space.roleLabel}</span>
              </span>
              {space.isCurrent && (
                <Check size={14} className="flex-none text-green-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceSwitcher;
