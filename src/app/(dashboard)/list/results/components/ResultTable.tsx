"use client";

import Table from "@/components/Table";
import { useState } from "react";
import StudentResultModal from "./StudentResultModal";
import { getResults } from "./actions";
import type { ReportCardData } from "@/lib/reportCard";
import type { ResultRow } from "./types";

// W03 — types partagés (classe résolue via Enrollment côté serveur)
type ResultWithDetails2 = ResultRow & { moyenne: number };

type ResultWithDetails = ResultRow;

interface ResultTableProps {
  data: ResultWithDetails2[];
  role: string;
  actions?: React.ReactNode;
  /** S13 — ReportCardData précalculés par le RSC parent, clé `${studentId}:${semesterId}`. */
  reportCards?: Record<string, ReportCardData>;
}

export default function ResultTable({
  data,
  role,
  actions,
  reportCards,
}: ResultTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    results: ResultWithDetails[];
    reportCard: ReportCardData | null;
  } | null>(null);

  const handleStudentClick = async (studentId: string, semesterId: number) => {
    const results = await getResults(studentId, semesterId);
    setSelectedStudent({
      id: studentId,
      name:
        results.find((item) => item.student.id === studentId)?.student.name ||
        "",
      results: results,
      reportCard: reportCards?.[`${studentId}:${semesterId}`] ?? null,
    });
  };

  return (
    <>
      <Table
        columns={[
          { header: "Etudiants", accessor: "student" },
          {
            header: "Semsestre",
            accessor: "semestre",
            className: "hidden md:table-cell",
          },
          {
            header: "Moyenne",
            accessor: "moyenne",
            className: "hidden md:table-cell",
          },
          {
            header: "Classe",
            accessor: "class",
            className: "hidden md:table-cell",
          },
          {
            header: "Aperçu",
            accessor: "preview",
            className: "hidden md:table-cell",
          },
        ]}
        renderRow={(item: ResultWithDetails2) => (
          <tr
            key={item.id}
            className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
          >
            <td className="hidden md:table-cell">{item.student.username}</td>
            <td>{item.semester.name}</td>
            <td
              className={`hidden md:table-cell font-semibold ${
                item.moyenne < 10 ? "text-red-500" : "text-green-500"
              }`}
            >
              {item.moyenne.toFixed(3)}
            </td>
            <td className="hidden md:table-cell">{item.student.class.name}</td>
            <td className="hidden md:table-cell">
              <button
                onClick={() =>
                  handleStudentClick(item.student.id, item.semester.id)
                }
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Voir détails
              </button>
            </td>
            {actions && (
              <td>
                <span className="flex items-center gap-2">{actions}</span>
              </td>
            )}
          </tr>
        )}
        data={data}
      />

      {selectedStudent && (
        <StudentResultModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          results={selectedStudent.results}
          role={role}
          reportCard={selectedStudent.reportCard}
        />
      )}
    </>
  );
}
