"use client";

import dynamic from "next/dynamic";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);
import ResultPDF from "./ResultPdf";
import { Prisma } from "@/app/generated/prisma";

import { useEffect, useState } from "react";

type QuestionWithAnswers = Prisma.QuestionGetPayload<{
  include: {
    StudentAnswer: true;
  };
}>;

const ResultPdfButton = ({
  questionsWithAnswers,
  totalScore,
  quizId,
  studentName,
  studentSurName,
}: {
  questionsWithAnswers: QuestionWithAnswers[];
  totalScore: number;
  quizId: string;
  studentName: string;
  studentSurName: string;
}) => {
  const [isClient, seIsClient] = useState(false);

  useEffect(() => {
    seIsClient(true);
  }, [isClient]);

  return (
    <div>
      {/* Bouton de téléchargement PDF */}
      <PDFDownloadLink
        document={
          <ResultPDF
            studentName={studentName}
            studentSurName={studentSurName}
            questions={questionsWithAnswers}
            score={totalScore}
          />
        }
        fileName={`resultat-quiz-${quizId}.pdf`}
      >
        <button className="group relative font-bold text-[17px] bg-blue-600 rounded-[0.75em] border-0 cursor-pointer w-[250px]">
          <span className="block box-border border-2 border-blue-600 rounded-[0.75em] bg-[#e8e8e8] text-blue-600 py-3 px-6 translate-y-[-0.2em] transition-transform ease-linear duration-100 group-hover:translate-y-[-0.33em] group-active:translate-y-0">
            Télécharger PDF
          </span>
        </button>
      </PDFDownloadLink>
    </div>
  );
};
export default ResultPdfButton;
