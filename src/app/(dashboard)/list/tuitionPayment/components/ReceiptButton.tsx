"use client";

import dynamic from "next/dynamic";

import { Download } from "lucide-react";

import ReceiptPDF from "./ReceipPdf";
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

// Définition des types
interface TuitionPayment {
  month: number;
  amount: number;
  paymentDate: Date;
}

interface StudentInfo {
  name: string;
  surname: string;
  className: string;
}

interface ReceiptPDFProps {
  student: StudentInfo;
  payments: TuitionPayment[];
  year: number;
}

interface ReceiptButtonProps {
  student: StudentInfo;
  payments: TuitionPayment[];
  year: number;
}

const ReceiptButton = ({ student, payments, year }: ReceiptButtonProps) => (
  <PDFDownloadLink
    document={<ReceiptPDF student={student} payments={payments} year={year} />}
    fileName={`reçu-${student.surname}-${year}.pdf`}
  >
    {({ loading }) => (
      <button
        className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
        disabled={loading}
      >
        <Download className="w-4 h-4 text-white" />
      </button>
    )}
  </PDFDownloadLink>
);

export default ReceiptButton;
