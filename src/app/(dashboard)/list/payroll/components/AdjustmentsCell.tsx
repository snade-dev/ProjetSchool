"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { updateSalaryAdjustments } from "@/lib/actions/payrollAction";

/**
 * Édition inline des primes / retenues d'un bulletin PENDING.
 * PAS d'optimistic UI (parade fiche) : on soumet à l'action (submit explicite ou
 * blur si la valeur a changé), le net est recalculé SERVEUR, puis `router.refresh()`
 * ré-rend la page depuis le serveur. Verrouillé si `locked` (statut PAID).
 */
const AdjustmentsCell = ({
  id,
  bonuses,
  deductions,
  locked = false,
}: {
  id: string;
  bonuses: number;
  deductions: number;
  locked?: boolean;
}) => {
  const router = useRouter();
  const [b, setB] = useState<string>(String(bonuses));
  const [d, setD] = useState<string>(String(deductions));
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(updateSalaryAdjustments, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Ajustement refusé.");
      // Revenir aux valeurs serveur (le refus n'a rien persisté).
      setB(String(bonuses));
      setD(String(deductions));
    }
  }, [state, router, bonuses, deductions]);

  // Synchronise les inputs si le serveur renvoie de nouvelles valeurs.
  useEffect(() => {
    setB(String(bonuses));
    setD(String(deductions));
  }, [bonuses, deductions]);

  const submit = () => {
    const nb = parseInt(b, 10);
    const nd = parseInt(d, 10);
    const bonusesVal = Number.isNaN(nb) ? 0 : nb;
    const deductionsVal = Number.isNaN(nd) ? 0 : nd;
    // Rien à faire si inchangé.
    if (bonusesVal === bonuses && deductionsVal === deductions) return;
    startTransition(() => {
      formAction({ id, bonuses: bonusesVal, deductions: deductionsVal });
    });
  };

  if (locked) {
    return (
      <div className="flex gap-4 text-sm text-gray-500">
        <span>{bonuses.toLocaleString("fr-FR")}</span>
        <span>{deductions.toLocaleString("fr-FR")}</span>
      </div>
    );
  }

  const inputClass =
    "w-24 ring-[1.5px] ring-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-lamaYellow disabled:bg-slate-100";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2"
    >
      <input
        type="number"
        min={0}
        value={b}
        disabled={isPending}
        aria-label="Primes"
        onChange={(e) => setB(e.target.value)}
        onBlur={submit}
        className={inputClass}
      />
      <input
        type="number"
        min={0}
        value={d}
        disabled={isPending}
        aria-label="Retenues"
        onChange={(e) => setD(e.target.value)}
        onBlur={submit}
        className={inputClass}
      />
      {/* Submit explicite (Entrée) — bouton caché pour l'accessibilité clavier. */}
      <button type="submit" className="hidden" aria-hidden />
    </form>
  );
};

export default AdjustmentsCell;
