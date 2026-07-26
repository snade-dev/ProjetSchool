"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { generateCanteenExtrasInvoices } from "@/lib/actions/invoiceAction";
import { Loader2, ReceiptText } from "lucide-react";

/**
 * X03/X04 — Facturer les repas à l'unité du mois affiché. L'action est
 * idempotente : relancer après de nouveaux pointages met la ligne à jour au
 * lieu d'en créer une seconde.
 */
const BillExtrasButton = ({
  month,
  year,
  extraMeals,
}: {
  month: number;
  year: number;
  extraMeals: number;
}) => {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [state, formAction] = useActionState(generateCanteenExtrasInvoices, {
    success: false,
    error: false,
    message: "",
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(state.message || "Repas à l'unité facturés.");
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error(state.message || "Erreur lors de la facturation.");
    }
  }, [state, router]);

  return (
    <button
      type="button"
      disabled={loading || extraMeals === 0}
      title={
        extraMeals === 0
          ? "Aucun repas à l'unité pointé sur ce mois"
          : undefined
      }
      onClick={() => {
        setLoading(true);
        startTransition(() => formAction({ month, year }));
      }}
      className="flex items-center gap-2 rounded-md bg-lamaSky px-4 py-2 text-sm font-medium text-sky-900 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <ReceiptText size={15} />
      )}
      {loading ? "Un instant…" : "Facturer les repas à l'unité"}
    </button>
  );
};

export default BillExtrasButton;
