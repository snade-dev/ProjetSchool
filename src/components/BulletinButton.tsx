"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import BulletinPDF from "./BulletinPDF";
import type { ReportCardData } from "@/lib/reportCard";

// PDFDownloadLink est client-only : import dynamique sans SSR (même parade que S07/S11).
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
 * S13 — Bouton de téléchargement du bulletin.
 * Reçoit un ReportCardData DÉJÀ calculé par le RSC parent (aucun accès DB ici).
 */
const BulletinButton = ({ data }: { data: ReportCardData }) => (
  <PDFDownloadLink
    document={<BulletinPDF data={data} />}
    fileName={`bulletin_${sanitize(data.student.surname)}_${sanitize(
      data.student.name
    )}_${sanitize(data.semester.name)}.pdf`}
  >
    {({ loading }) => (
      <button
        type="button"
        disabled={loading}
        title={`Télécharger le bulletin — ${data.semester.name}`}
        className="flex items-center gap-2 px-4 py-2 bg-blue-400 text-white rounded-md text-sm hover:bg-blue-500 disabled:bg-gray-300"
      >
        <Download size={16} />
        Télécharger le bulletin
      </button>
    )}
  </PDFDownloadLink>
);

export default BulletinButton;
