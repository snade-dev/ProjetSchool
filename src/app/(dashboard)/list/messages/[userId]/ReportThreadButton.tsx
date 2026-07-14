"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Flag, X } from "lucide-react";
import { reportThread } from "@/lib/actions/messageAction";

/**
 * W16 — « Signaler » un fil (§2.6.5, harcèlement) : notifie la direction de
 * l'école (admin/director) + entrée d'audit message.report. Pas d'autre
 * workflow en V1.
 */
const ReportThreadButton = ({ otherUserId }: { otherUserId: string }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const res = await reportThread(otherUserId, reason);
      if (res.success) {
        toast("Conversation signalée à la direction.");
        setOpen(false);
        setReason("");
      } else {
        toast.error(res.message ?? "Erreur lors du signalement.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-red-500"
        title="Signaler cette conversation à la direction"
      >
        <Flag size={14} />
        Signaler
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Signaler cette conversation
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Le signalement est transmis à la direction de l&apos;établissement
              (harcèlement, contenu inapproprié…). La conversation pourra être
              consultée par la direction.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Motif (optionnel mais recommandé)"
              className="mt-3 w-full resize-none rounded-md p-2.5 text-sm outline-none ring-[1.5px] ring-gray-300 transition focus:ring-2 focus:ring-lamaSky"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-xs text-gray-500 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                <Flag size={12} />
                {pending ? "Envoi…" : "Signaler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportThreadButton;
