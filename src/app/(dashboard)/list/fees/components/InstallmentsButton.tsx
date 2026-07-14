"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CalendarDays } from "lucide-react";
import {
  updateFeeInstallments,
  clearFeeInstallments,
} from "@/lib/actions/feeAction";

/**
 * W11 — Éditeur d'échéancier d'un frais MONTHLY (§2.4.2) : l'école coche les
 * mois payables (7, 8, 9, 10 mensualités…) et fixe le montant de CHAQUE mois
 * (pré-rempli avec le montant uniforme). Total annuel recalculé en direct.
 * Sans échéancier enregistré, le frais garde le comportement uniforme
 * (facturé chaque mois au même montant).
 */

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

type Row = { month: number; enabled: boolean; amount: number };

type Props = {
  feeId: number;
  feeLabel: string;
  feeAmount: number; // montant uniforme (pré-remplissage)
  installments: { month: number; amount: number }[];
};

const buildRows = (
  feeAmount: number,
  installments: { month: number; amount: number }[]
): Row[] => {
  const byMonth = new Map(installments.map((i) => [i.month, i.amount]));
  return MONTH_NAMES.map((_, idx) => {
    const month = idx + 1;
    const existing = byMonth.get(month);
    return {
      month,
      enabled: existing !== undefined,
      amount: existing ?? feeAmount,
    };
  });
};

const InstallmentsButton = ({
  feeId,
  feeLabel,
  feeAmount,
  installments,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    buildRows(feeAmount, installments)
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasInstallments = installments.length > 0;
  const enabledRows = rows.filter((r) => r.enabled);
  const annualTotal = enabledRows.reduce((sum, r) => sum + r.amount, 0);

  const openEditor = () => {
    setRows(buildRows(feeAmount, installments));
    setOpen(true);
  };

  const toggleMonth = (month: number) =>
    setRows((prev) =>
      prev.map((r) => (r.month === month ? { ...r, enabled: !r.enabled } : r))
    );

  const setAmount = (month: number, value: string) => {
    const amount = Number(value);
    setRows((prev) =>
      prev.map((r) =>
        r.month === month
          ? { ...r, amount: Number.isFinite(amount) ? amount : 0 }
          : r
      )
    );
  };

  const handleSave = () => {
    if (enabledRows.length === 0) {
      toast.error("Sélectionnez au moins un mois payable.");
      return;
    }
    if (enabledRows.some((r) => !Number.isInteger(r.amount) || r.amount <= 0)) {
      toast.error("Chaque mois coché doit avoir un montant entier supérieur à 0.");
      return;
    }
    startTransition(async () => {
      const res = await updateFeeInstallments(
        { success: false, error: false },
        {
          feeStructureId: feeId,
          installments: enabledRows.map((r) => ({
            month: r.month,
            amount: r.amount,
          })),
        }
      );
      if (res.success) {
        toast(
          `Échéancier enregistré : ${enabledRows.length} mensualité(s), ${formatFCFA(annualTotal)} sur l'année.`
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "Enregistrement impossible.");
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      const res = await clearFeeInstallments(feeId);
      if (res.success) {
        toast("Échéancier supprimé : retour au montant uniforme chaque mois.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "Suppression impossible.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        title="Configurer l'échéancier (mois payables et montants)"
        className={`flex items-center gap-1 text-xs py-1 px-2 rounded-md ${
          hasInstallments
            ? "bg-lamaSky text-sky-800 hover:bg-lamaSkyLight"
            : "bg-gray-100 text-gray-600 hover:bg-lamaPurpleLight"
        }`}
      >
        <CalendarDays size={13} />
        {hasInstallments ? `Échéancier (${installments.length} mois)` : "Échéancier"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[92%] md:w-[560px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-md flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Échéancier — {feeLabel}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Cochez les mois payables et fixez le montant de chaque mois
                (mensualités pas forcément égales). Sans échéancier, le frais
                est facturé chaque mois à {formatFCFA(feeAmount)}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {rows.map((row) => (
                <div
                  key={row.month}
                  className={`flex items-center gap-2 p-1.5 rounded-md ${
                    row.enabled ? "bg-lamaSkyLight" : ""
                  }`}
                >
                  <label className="flex items-center gap-2 text-sm w-28 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={() => toggleMonth(row.month)}
                    />
                    {MONTH_NAMES[row.month - 1]}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={row.amount}
                    disabled={!row.enabled}
                    onChange={(e) => setAmount(row.month, e.target.value)}
                    className="ring-[1.5px] ring-gray-300 p-1.5 rounded-md text-sm w-full disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              ))}
            </div>

            {/* Total annuel en temps réel */}
            <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-md p-3">
              <span className="text-sm text-gray-500">
                {enabledRows.length} mensualité(s) sélectionnée(s)
              </span>
              <span className="text-sm font-semibold">
                Total annuel : {formatFCFA(annualTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              {hasInstallments ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClear}
                  className="text-xs text-red-500 underline disabled:text-gray-400"
                >
                  Revenir au montant uniforme (supprimer l&apos;échéancier)
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm py-2 px-4 rounded-md border border-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSave}
                  className="text-sm bg-blue-400 text-white py-2 px-4 rounded-md disabled:bg-slate-400"
                >
                  {isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallmentsButton;
