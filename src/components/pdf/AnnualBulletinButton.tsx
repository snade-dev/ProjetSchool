"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import AnnualBulletinPdf from "./AnnualBulletinPdf";
import type { AnnualReportData } from "@/lib/annualReport";

// PDFDownloadLink est client-only : import dynamique sans SSR (parade S07/S11/S13).
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <span className="text-xs text-gray-400">Préparation du bulletin…</span>
    ),
  }
);

const sanitize = (s: string) => s.replace(/\s+/g, "_");

/**
 * X07 — Bouton de téléchargement du bulletin ANNUEL.
 * Reçoit un AnnualReportData DÉJÀ calculé par le RSC parent (aucun accès DB).
 */
const AnnualBulletinButton = ({
  data,
  compact,
}: {
  data: AnnualReportData;
  /** Variante discrète pour une cellule de tableau (liste de classe). */
  compact?: boolean;
}) => (
  <PDFDownloadLink
    // key = remount forcé quand (élève, année) change : le chemin « update » du
    // reconciler react-pdf crashe en build minifié si la structure change (S13).
    key={`${data.student.id}-${data.schoolYearName}`}
    document={<AnnualBulletinPdf data={data} />}
    fileName={`bulletin_annuel_${sanitize(data.student.surname)}_${sanitize(
      data.student.name
    )}_${sanitize(data.schoolYearName)}.pdf`}
  >
    {({ loading }) =>
      compact ? (
        <button
          type="button"
          disabled={loading}
          title="Télécharger le bulletin annuel"
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-300"
        >
          <Download size={14} />
          Bulletin
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          title={`Bulletin annuel — ${data.schoolYearName}`}
          className="flex items-center gap-2 rounded-md bg-blue-400 px-4 py-2 text-sm text-white transition hover:bg-blue-500 disabled:bg-gray-300"
        >
          <Download size={16} />
          Bulletin annuel
        </button>
      )
    }
  </PDFDownloadLink>
);

export default AnnualBulletinButton;
