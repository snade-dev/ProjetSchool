"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Import dynamique de PDFDownloadLink
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <p>Chargement...</p>,
  }
);

// Import dynamique de BulletinPDF
const BulletinPDF = dynamic(() => import("./BulletinPDF"), {
  ssr: false,
  loading: () => <p>Chargement du PDF...</p>,
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

const BulletinButton = ({
  studentName,
  grades,
  className,
  semesterName,
}: BulletinButtonProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isClient) {
    return <p>Chargement...</p>;
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
        {({ loading }) =>
          loading ? (
            <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-wait opacity-50">
              <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6">
                Chargement...
              </span>
            </button>
          ) : (
            <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer">
              <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0">
                Télécharger le bulletin
              </span>
            </button>
          )
        }
      </PDFDownloadLink>
    </div>
  );
};

export default BulletinButton;
