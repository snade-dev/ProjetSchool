"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Copy } from "lucide-react";
import { duplicateFees } from "@/lib/actions/feeAction";

type ClassOption = { id: number; name: string };

const DuplicateFeesButton = ({
  fromClassId,
  fromClassName,
  classes,
}: {
  fromClassId: number;
  fromClassName: string;
  classes: ClassOption[];
}) => {
  const [open, setOpen] = useState(false);
  const [toClassId, setToClassId] = useState<number | "">("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const targets = classes.filter((c) => c.id !== fromClassId);

  const handleConfirm = () => {
    if (!toClassId) {
      toast.error("Sélectionnez une classe cible.");
      return;
    }
    startTransition(async () => {
      const res = await duplicateFees(fromClassId, Number(toClassId));
      if (res.success) {
        toast("Frais dupliqués (les libellés déjà présents ont été ignorés).");
        setOpen(false);
        setToClassId("");
        router.refresh();
      } else {
        toast.error("Duplication impossible (aucun frais source ou erreur).");
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
        <Copy size={14} />
        Dupliquer vers une autre classe
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[40%] bg-white p-6 rounded-md flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Dupliquer les frais</h2>
            <p className="text-sm text-gray-500">
              Copier tous les frais de la classe cible depuis
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500">Classe source</label>
              <input
                disabled
                value={fromClassName}
                className="ring-[1.5px] ring-gray-200 bg-gray-100 p-2 rounded-md text-sm w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500">Classe cible</label>
              <select
                value={toClassId}
                onChange={(e) =>
                  setToClassId(e.target.value ? Number(e.target.value) : "")
                }
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              >
                <option value="">— Choisir une classe —</option>
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                {isPending ? "Duplication…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DuplicateFeesButton;
