"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createJustification } from "@/lib/actions/justificationAction";
import UploadField from "./UploadField";
import { FilePen, X } from "lucide-react";

/**
 * W15 — bouton « Justifier » d'une absence (§2.3.6, côté parent).
 * Affiché sur /list/attendances (vue parent) pour chaque absence non justifiée
 * de SES enfants (le lien StudentGuardian est revérifié côté serveur).
 * Ouvre une petite carte : motif obligatoire + document scanné optionnel
 * (flux /api/upload existant). La direction accepte ou refuse ensuite.
 */
const JustifyAbsenceButton = ({
  attendanceId,
  studentName,
  date,
}: {
  attendanceId: number;
  studentName: string;
  date: string;
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState(createJustification, {
    success: false,
    error: false,
    message: "",
  });
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Justification envoyée ! Elle sera examinée par l'école.");
      setOpen(false);
      setLoading(false);
      router.refresh();
    } else {
      setLoading(false);
    }
  }, [state, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    startTransition(() => {
      formAction({ attendanceId, reason: reason.trim(), fileUrl: fileUrl ?? "" });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-lamaYellow px-2.5 py-1.5 text-xs font-medium hover:opacity-80"
      >
        <FilePen size={13} />
        Justifier
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-gray-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fermer"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
            <h2 className="text-base font-semibold">Justifier une absence</h2>
            <p className="mt-1 text-xs text-gray-500">
              {studentName} — absence du {date}
            </p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Motif de l&apos;absence
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Maladie, rendez-vous médical, raison familiale…"
                  className="ring-[1.5px] ring-gray-300 p-2.5 rounded-md w-full text-sm outline-none transition focus:ring-2 focus:ring-lamaSky"
                />
              </div>
              {/* document scanné optionnel (certificat médical…) */}
              <UploadField
                label="Joindre un document (image ou PDF)"
                value={fileUrl}
                onChange={setFileUrl}
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              />
              {state.error && (
                <span className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
                  {(state as any).message || "Une erreur s'est produite"}
                </span>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border-[1.5px] border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default JustifyAbsenceButton;
