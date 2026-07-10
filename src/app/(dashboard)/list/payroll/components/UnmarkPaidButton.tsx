"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Undo2 } from "lucide-react";
import { unmarkSalaryPaid } from "@/lib/actions/payrollAction";

/**
 * Bouton discret de correction (admin) : repasse un bulletin PAID en PENDING.
 */
const UnmarkPaidButton = ({ id }: { id: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Annuler ce paiement et repasser le bulletin en attente ?"))
      return;
    startTransition(async () => {
      const res = await unmarkSalaryPaid(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message || "Erreur.");
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      title="Annuler le paiement (correction)"
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
    >
      <Undo2 size={13} />
      Annuler
    </button>
  );
};

export default UnmarkPaidButton;
