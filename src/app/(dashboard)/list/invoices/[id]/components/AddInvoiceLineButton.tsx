"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { addInvoiceLine } from "@/lib/actions/invoiceAction";

const AddInvoiceLineButton = ({ invoiceId }: { invoiceId: string }) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitAmount, setUnitAmount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    if (!label.trim() || quantity <= 0 || unitAmount <= 0) {
      toast.error("Renseignez un libellé, une quantité et un PU valides.");
      return;
    }
    startTransition(async () => {
      const res = await addInvoiceLine(invoiceId, {
        label: label.trim(),
        quantity,
        unitAmount,
      });
      if (res.success) {
        toast("Ligne ajoutée, total recalculé.");
        setOpen(false);
        setLabel("");
        setQuantity(1);
        setUnitAmount(0);
        router.refresh();
      } else {
        toast.error("Ajout impossible (facture payée/annulée ou erreur).");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs bg-lamaPurpleLight text-gray-700 py-1 px-3 rounded-md hover:bg-lamaPurple"
      >
        <Plus size={14} /> Ajouter une ligne
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[40%] bg-white p-6 rounded-md flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Ajouter une ligne</h2>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500">Libellé</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="text-xs text-gray-500">Quantité</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="text-xs text-gray-500">PU (FCFA)</label>
                <input
                  type="number"
                  value={unitAmount}
                  onChange={(e) => setUnitAmount(Number(e.target.value))}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
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
                onClick={handleConfirm}
                className="text-sm bg-blue-400 text-white py-2 px-4 rounded-md disabled:bg-slate-400"
              >
                {isPending ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddInvoiceLineButton;
