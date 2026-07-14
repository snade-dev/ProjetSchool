"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { decideJustification } from "@/lib/actions/justificationAction";
import { Check, X } from "lucide-react";

/**
 * W15 — boutons Accepter / Refuser d'une justification d'absence (§2.3.6),
 * côté école (admin / director / supervisor). Refuser ouvre une petite carte
 * avec un motif OPTIONNEL transmis au parent dans la notification.
 * Accepter pose Attendance.justified=true (transaction côté serveur).
 */
const JustificationDecision = ({ id }: { id: number }) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(decideJustification, {
    success: false,
    error: false,
    message: "",
  });
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Décision enregistrée, le parent est notifié.");
      setRejectOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
      if (state.error && (state as any).message) {
        toast.error((state as any).message);
      }
    }
  }, [state, router]);

  const decide = (decision: "ACCEPT" | "REJECT", withNote?: string) => {
    setLoading(true);
    startTransition(() => {
      formAction({ id, decision, note: withNote });
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => decide("ACCEPT")}
          className="flex items-center gap-1 rounded-md bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
        >
          <Check size={13} />
          Accepter
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRejectOpen(true)}
          className="flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
        >
          <X size={13} />
          Refuser
        </button>
      </div>
      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
          onClick={() => setRejectOpen(false)}
        >
          <div
            className="relative w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Refuser la justification</h2>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">
                Motif du refus (optionnel — transmis au parent)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Document illisible, motif insuffisant…"
                className="ring-[1.5px] ring-gray-300 p-2.5 rounded-md w-full text-sm outline-none transition focus:ring-2 focus:ring-lamaSky"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="rounded-lg border-[1.5px] border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => decide("REJECT", note)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Un instant…" : "Refuser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JustificationDecision;
