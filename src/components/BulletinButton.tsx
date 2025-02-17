"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

// Import dynamique de PDFDownloadLink et BulletinPDF
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => null,
  }
);

const BulletinPDF = dynamic(() => import("./BulletinPDF"), {
  ssr: false,
  loading: () => null,
});

// Définition des types
// Définition des types pour les props
interface Grade {
  subject: string;
  score: number;
}

interface BulletinButtonProps {
  studentName: string;
  grades: Grade[];
  className: string;
  semesterName: string;
}

const BulletinButton = ({ studentName, grades, className, semesterName }: BulletinButtonProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer">
        <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em]">
          Chargement...
        </span>
      </button>
    );
  }

  return (
    <div>
      <PDFDownloadLink
        document={
          <BulletinPDF 
            studentName={studentName} 
            grades={grades}
            className={className}
            semesterName={semesterName}
          />
        }
        fileName={`${studentName.replace(" ", "_")}_Bulletin_${semesterName}.pdf`}
      >
        {({ loading }) => (
          <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer">
            <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0">
              {loading ? "Chargement..." : "Télécharger le bulletin"}
            </span>
          </button>
        )}
      </PDFDownloadLink>
    </div>
  );
};

export default BulletinButton;
