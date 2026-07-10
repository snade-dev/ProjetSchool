import { InvoiceStatus } from "@/app/generated/prisma";

// Map statut de facture → libellé FR + couleur (pill text-xs px-2 py-1 rounded-full).
const statusMap: Record<InvoiceStatus, { label: string; className: string }> = {
  ISSUED: { label: "Émise", className: "bg-lamaSky text-sky-800" },
  PARTIALLY_PAID: {
    label: "Partielle",
    className: "bg-lamaYellow text-yellow-800",
  },
  PAID: { label: "Payée", className: "bg-green-100 text-green-700" },
  OVERDUE: { label: "En retard", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulée", className: "bg-gray-100 text-gray-500" },
};

const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const { label, className } = statusMap[status] ?? statusMap.ISSUED;
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
};

export default InvoiceStatusBadge;
