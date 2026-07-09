"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Wallet } from "lucide-react";
import { generatePayroll } from "@/lib/actions/payrollAction";

/**
 * Bouton admin « Générer la paie du mois ». Confirmation native puis action.
 * `alreadyGenerated` désactive le bouton (tooltip) quand des bulletins existent
 * déjà pour ce mois. `big` = variante CTA centrée (état vide de la page).
 */
const GeneratePayrollButton = ({
  month,
  year,
  monthLabel,
  alreadyGenerated = false,
  big = false,
}: {
  month: number;
  year: number;
  monthLabel: string;
  alreadyGenerated?: boolean;
  big?: boolean;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(generatePayroll, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Erreur lors de la génération.");
    }
  }, [state, router]);

  const onClick = () => {
    if (alreadyGenerated) return;
    if (
      !confirm(
        `Générer la paie de ${monthLabel} ${year} pour tous les employés actifs ?`
      )
    )
      return;
    startTransition(() => {
      formAction({ month, year });
    });
  };

  if (big) {
    return (
      <button
        onClick={onClick}
        disabled={isPending}
        className="flex items-center gap-2 bg-blue-400 text-white text-sm px-5 py-3 rounded-md hover:bg-blue-500 disabled:bg-slate-400"
      >
        <Wallet size={18} />
        {isPending ? "Génération…" : `Générer la paie de ${monthLabel} ${year}`}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={alreadyGenerated || isPending}
      title={
        alreadyGenerated
          ? "La paie de ce mois est déjà générée"
          : "Générer la paie du mois"
      }
      className="flex items-center gap-2 bg-blue-400 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
    >
      <Wallet size={16} />
      <span className="hidden md:inline">Générer la paie du mois</span>
      <span className="md:hidden">Générer</span>
    </button>
  );
};

export default GeneratePayrollButton;
