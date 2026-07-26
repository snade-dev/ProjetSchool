"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { toggleContributionClosed } from "@/lib/actions/contributionAction";
import { Loader2, Lock, LockOpen } from "lucide-react";

/**
 * X06 — Clôture / réouverture du registre de cotisation (§2.4). Un registre
 * clos n'accepte plus de versement ; le récapitulatif reste consultable.
 */
const CloseRegisterButton = ({
  contributionId,
  closed,
}: {
  contributionId: number;
  closed: boolean;
}) => {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [state, formAction] = useActionState(toggleContributionClosed, {
    success: false,
    error: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast(closed ? "Registre rouvert." : "Registre clôturé.");
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error("Erreur lors du changement d'état du registre.");
    }
  }, [state, router, closed]);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        startTransition(() =>
          formAction({ contributionId, close: !closed })
        );
      }}
      className="flex items-center gap-2 rounded-md border-[1.5px] border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : closed ? (
        <LockOpen size={15} />
      ) : (
        <Lock size={15} />
      )}
      {closed ? "Rouvrir le registre" : "Clôturer le registre"}
    </button>
  );
};

export default CloseRegisterButton;
