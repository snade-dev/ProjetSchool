"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Bell, BellRing } from "lucide-react";
import { markReminded } from "@/lib/actions/invoiceAction";

/**
 * Cloche de relance dans une ligne OVERDUE (E33). Ouvre un petit modal pour
 * saisir/mettre à jour une note de relance ; le tooltip natif rappelle la
 * date et la note de la dernière relance. Aucun envoi SMS/e-mail (hors scope).
 */
const RemindButton = ({
  invoiceId,
  student,
  remindedAt,
  reminderNote,
}: {
  invoiceId: string;
  student: string;
  remindedAt: string | null;
  reminderNote: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(reminderNote ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const reminded = Boolean(remindedAt);
  const remindedLabel = remindedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(remindedAt))
    : null;

  const tooltip = reminded
    ? `Relancé le ${remindedLabel}${reminderNote ? ` — ${reminderNote}` : ""}`
    : "Marquer comme relancé";

  const onConfirm = () => {
    startTransition(async () => {
      const res = await markReminded(invoiceId, note);
      if (res.success) {
        toast.success("Relance enregistrée.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de l'enregistrement de la relance.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tooltip}
        aria-label={tooltip}
        className={`w-7 h-7 flex items-center justify-center rounded-full ${
          reminded ? "bg-lamaYellow text-yellow-800" : "bg-red-100 text-red-600"
        }`}
      >
        {reminded ? <BellRing size={16} /> : <Bell size={16} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative w-[90%] md:w-[45%] lg:w-[35%] xl:w-[30%] bg-white p-6 rounded-md flex flex-col gap-4">
            <div
              className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-700"
              onClick={() => setOpen(false)}
            >
              ✕
            </div>

            <h1 className="text-lg font-semibold">Note de relance</h1>
            <p className="text-xs text-gray-400">{student}</p>

            {reminded && (
              <div className="bg-lamaYellowLight text-xs text-gray-600 p-2 rounded-md">
                Dernière relance : {remindedLabel}
                {reminderNote ? ` — ${reminderNote}` : ""}
              </div>
            )}

            <textarea
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full min-h-[90px]"
              placeholder="Ex : appel du parent, promesse de règlement…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-2 rounded-md ring-[1.5px] ring-gray-300 text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="bg-blue-400 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-500 disabled:bg-slate-400"
              >
                {isPending ? "Enregistrement…" : "Marquer relancé"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RemindButton;
