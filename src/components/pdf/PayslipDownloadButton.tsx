"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import PayslipPdf, { PayslipData } from "./PayslipPdf";

// PDFDownloadLink est client-only : import dynamique sans SSR (parade story-07).
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <span className="text-xs text-gray-400">Bulletin…</span>,
  }
);

const PayslipDownloadButton = ({ data }: { data: PayslipData }) => (
  <PDFDownloadLink
    document={<PayslipPdf data={data} />}
    fileName={`bulletin-${data.payslipNo}.pdf`}
  >
    {({ loading }) => (
      <button
        type="button"
        disabled={loading}
        title="Télécharger le bulletin de paie"
        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-300"
      >
        <Download size={14} />
        Bulletin
      </button>
    )}
  </PDFDownloadLink>
);

export default PayslipDownloadButton;
