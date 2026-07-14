"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { emailReportCardToGuardians } from "@/lib/actions/emailAction";

/**
 * W13 — « Envoyer par email aux tuteurs » (fiche élève, admin/director) :
 * envoie LE bulletin PDF de CET élève (période sélectionnée) en pièce jointe
 * aux tuteurs canViewGrades. Affiche le résultat sous le bouton.
 */
const EmailBulletinButton = ({
  studentId,
  semesterId,
}: {
  studentId: string;
  semesterId: number;
}) => {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const send = () => {
    setResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("studentId", studentId);
      fd.set("semesterId", String(semesterId));
      const res = await emailReportCardToGuardians(
        { success: false, error: false },
        fd
      );
      setResult({
        ok: res.success,
        message: res.message ?? (res.success ? "Bulletin envoyé." : "Échec."),
      });
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={send}
        title="Envoie le bulletin PDF de cette période aux tuteurs de l'élève"
        className="flex w-max items-center gap-2 rounded-md bg-lamaPurpleLight px-4 py-2 text-sm text-gray-700 hover:bg-lamaPurple disabled:opacity-50"
      >
        <Mail size={16} />
        {pending ? "Envoi en cours…" : "Envoyer par email aux tuteurs"}
      </button>
      {result && (
        <p
          className={`text-xs ${result.ok ? "text-green-600" : "text-red-500"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
};

export default EmailBulletinButton;
