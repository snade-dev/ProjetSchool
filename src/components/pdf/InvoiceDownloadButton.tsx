"use client";

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import InvoicePdf, { InvoicePdfData } from "./InvoicePdf";

// PDFDownloadLink est client-only : import dynamique sans SSR (parade story-07).
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <span className="text-xs text-gray-400">PDF…</span>,
  }
);

const InvoiceDownloadButton = ({ data }: { data: InvoicePdfData }) => (
  <PDFDownloadLink
    document={<InvoicePdf data={data} />}
    fileName={`facture-${data.reference}.pdf`}
  >
    {({ loading }) => (
      <button
        type="button"
        disabled={loading}
        title="Télécharger la facture"
        className="flex items-center gap-1 text-sm py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:text-gray-300"
      >
        <FileText size={16} />
        Facture PDF
      </button>
    )}
  </PDFDownloadLink>
);

export default InvoiceDownloadButton;
