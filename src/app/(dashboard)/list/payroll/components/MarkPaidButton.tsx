"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CheckCircle2 } from "lucide-react";
import { markSalaryPaid } from "@/lib/actions/payrollAction";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance";

/**
 * Bouton « Marquer payé » + modal (méthode + date). PENDING → PAID côté serveur.
 */
const MarkPaidButton = ({ id }: { id: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<
    "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CHEQUE"
  >("CASH");
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(markSalaryPaid, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Marquage refusé.");
    }
  }, [state, router]);

  const onConfirm = () => {
    startTransition(() => {
      formAction({ id, method, paidAt: new Date(paidAt) });
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Marquer payé"
        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
      >
        <CheckCircle2 size={14} />
        Marquer payé
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[50%] lg:w-[35%] bg-white p-6 rounded-md flex flex-col gap-5">
            <div
              className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={() => setOpen(false)}
            >
              ✕
            </div>

            <h1 className="text-lg font-semibold">Marquer le salaire payé</h1>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500">Méthode</label>
              <select
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500">Date de paiement</label>
              <input
                type="date"
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-2 rounded-md ring-[1.5px] ring-gray-300 text-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={isPending}
                className="bg-blue-400 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-500 disabled:bg-slate-400"
              >
                {isPending ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarkPaidButton;
