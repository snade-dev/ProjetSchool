"use client";

import dynamic from "next/dynamic";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);
import React, { useEffect, useState } from "react";
import BulletinPDF from "./BulletinPDF";

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
    setIsClient(true);
  }, []);

  return isClient ? (
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
        fileName={`${studentName.replace(
          " ",
          "_"
        )}_Bulletin_${semesterName}.pdf`}
      >
        <button className="group relative font-bold text-[17px] bg-black rounded-[0.75em] border-0 cursor-pointer">
          <span className="block box-border border-2 border-black rounded-[0.75em] bg-[#e8e8e8] text-black py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0">
            Télécharger le bulletin
          </span>
        </button>
      </PDFDownloadLink>
    </div>
  ) : (
    <p>...Loading</p>
  );
};

export default BulletinButton;
