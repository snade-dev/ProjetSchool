"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import TransferCertificatePdf from "./TransferCertificatePdf";
import type { TransferCertificateData } from "@/lib/transferCertificate";

// PDFDownloadLink est client-only : import dynamique sans SSR (parade S07/S13).
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <span className="text-xs text-gray-400">Certificat…</span>,
  }
);

/** X08 — Téléchargement d'un certificat de transfert déjà émis. */
const TransferCertificateButton = ({
  data,
}: {
  data: TransferCertificateData;
}) => (
  <PDFDownloadLink
    key={data.reference}
    document={<TransferCertificatePdf data={data} />}
    fileName={`certificat-transfert-${data.reference}.pdf`}
  >
    {({ loading }) => (
      <button
        type="button"
        disabled={loading}
        title="Télécharger le certificat de transfert"
        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-300"
      >
        <Download size={14} />
        Certificat
      </button>
    )}
  </PDFDownloadLink>
);

export default TransferCertificateButton;
