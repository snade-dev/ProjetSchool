"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";
import { deleteInvoiceLine } from "@/lib/actions/invoiceAction";

const DeleteInvoiceLineButton = ({ lineId }: { lineId: number }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteInvoiceLine(lineId);
      if (res.success) {
        toast("Ligne supprimée, total recalculé.");
        router.refresh();
      } else {
        toast.error(
          "Suppression impossible (facture payée/annulée, ou dernière ligne)."
        );
      }
    });
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="p-1 text-red-500 disabled:text-gray-300"
      title="Supprimer la ligne"
    >
      <Trash2 size={16} />
    </button>
  );
};

export default DeleteInvoiceLineButton;
