"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";
import { deletePayment } from "@/lib/actions/paymentAction";

const DeletePaymentButton = ({ paymentId }: { paymentId: string }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm("Supprimer ce paiement ? Le statut de la facture sera recalculé.")) {
      return;
    }
    startTransition(async () => {
      const res = await deletePayment(paymentId);
      if (res.success) {
        toast("Paiement supprimé.");
        router.refresh();
      } else {
        toast.error("Suppression impossible.");
      }
    });
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      title="Supprimer ce paiement (erreur de saisie)"
      className="text-gray-300 hover:text-red-500 disabled:text-gray-200"
    >
      <Trash2 size={14} />
    </button>
  );
};

export default DeletePaymentButton;
