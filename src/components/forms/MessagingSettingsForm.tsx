"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { updateStudentMessaging } from "@/lib/actions/messageAction";

/**
 * W16 — Section « Messagerie » de /settings (admin) : toggle de la messagerie
 * élève ↔ enseignant (§2.6.5 « optionnel, désactivable par l'école »).
 * Les autres règles de mise en relation sont fixes (codées en dur).
 */
const MessagingSettingsForm = ({ enabled }: { enabled: boolean }) => {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (next: boolean) => {
    setChecked(next);
    startTransition(async () => {
      const res = await updateStudentMessaging(next);
      if (res.success) {
        toast(
          next
            ? "Messagerie élève ↔ enseignant activée."
            : "Messagerie élève ↔ enseignant désactivée."
        );
        router.refresh();
      } else {
        setChecked(!next); // rollback visuel
        toast.error(res.message ?? "Erreur lors de la mise à jour.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        La messagerie interne relie parents, enseignants et direction selon des
        règles fixes (un parent ne peut écrire qu&apos;à la direction et aux
        enseignants de ses enfants ; les échanges entre parents sont interdits).
        Seule la messagerie élève ↔ enseignant est optionnelle.
      </p>
      <label className="flex w-max cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 accent-lamaSky"
        />
        Autoriser les élèves à écrire aux enseignants de leur classe
      </label>
    </div>
  );
};

export default MessagingSettingsForm;
