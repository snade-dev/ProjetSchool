"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Ban } from "lucide-react";
import { cancelInvoice } from "@/lib/actions/invoiceAction";

const CancelInvoiceButton = ({
  invoiceId,
  hasPayments,
}: {
  invoiceId: string;
  hasPayments: boolean;
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCancel = () => {
    if (hasPayments) return;
    startTransition(async () => {
      const res = await cancelInvoice(invoiceId);
      if (res.success) {
        toast("Facture annulée.");
        router.refresh();
      } else {
        toast.error("Annulation impossible (un paiement existe ou erreur).");
      }
    });
  };

  return (
    <button
      type="button"
      disabled={hasPayments || isPending}
      onClick={handleCancel}
      title={
        hasPayments
          ? "Impossible : un paiement existe déjà"
          : "Annuler la facture"
      }
      className="flex items-center gap-1 text-sm py-2 px-4 rounded-md border border-red-300 text-red-600 disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed"
    >
      <Ban size={16} />
      {isPending ? "Annulation…" : "Annuler la facture"}
    </button>
  );
};

export default CancelInvoiceButton;
