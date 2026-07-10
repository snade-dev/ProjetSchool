"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ChevronDown, CircleUserRound, Loader2, LogOut } from "lucide-react";

// Menu du compte connecté (navbar) : accès à « Mon compte » + déconnexion.
const UserMenu = ({ name, roleLabel }: { name: string; roleLabel: string }) => {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // fermeture au clic extérieur / Échap
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

  const initials =
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      router.push("/sign-in");
      router.refresh();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-white"
      >
        <span className="drawer-hero-bg grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden flex-col items-start sm:flex">
          <span className="text-xs font-medium leading-tight">{name}</span>
          <span className="text-[10px] leading-tight text-gray-500">{roleLabel}</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-900/10"
        >
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <CircleUserRound size={16} className="text-gray-400" />
            Mon compte
          </Link>
          <div className="mx-3 my-1 h-px bg-gray-100" aria-hidden />
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={signOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            {signingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
