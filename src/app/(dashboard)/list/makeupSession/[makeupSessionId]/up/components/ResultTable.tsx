"use client";

import Table from "@/components/Table";
import { useState } from "react";
import StudentResultModal from "./StudentResultModal";
import { getResults } from "./actions";
import type { MakeupExamRow, MakeupExamSessionRow } from "./types";

// W03 — types partagés (classe résolue via Enrollment côté serveur)
type ResultWithDetails = MakeupExamRow;

type ResultWithDetails2 = MakeupExamSessionRow;

interface ResultTableProps {
  data: ResultWithDetails2[];
  role: string;
  actions?: React.ReactNode;
  moyenne: number;
}

export default function ResultTable({
  data,
  role,
  actions,
  moyenne,
}: ResultTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    results: ResultWithDetails[];
  } | null>(null);

  const handleStudentClick = async (studentId: string, sessionId: string) => {
    const results = await getResults(studentId, sessionId);
    setSelectedStudent({
      id: studentId,
      name:
        results.find((item) => item.student.id === studentId)?.student.name ||
        "",
      results: results,
    });
  };

  return (
    <>
      <Table
        columns={[
          { header: "Etudiants", accessor: "student" },
          // {
          //   header: "Moyenne",
          //   accessor: "moyenne",
          //   className: "hidden md:table-cell",
          // },
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
          // ...(role === "admin" || role === "teacher"
          //   ? [{ header: "Actions", accessor: "action" }]
          //   : []),
        ]}
        renderRow={(item: ResultWithDetails2) => (
          <tr
            key={item.id}
            className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
          >
            <td className="flex items-center gap-4 p-4">{item.student.name}</td>
            {/* <td className="hidden md:table-cell">{moyenne}</td> */}
            <td className="hidden md:table-cell">{item.student.class.name}</td>
            <td className="hidden md:table-cell">
              <button
                onClick={() =>
                  handleStudentClick(item.student.id, item.sessionId)
                }
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Voir détails
              </button>
            </td>
            {actions && (
              <td>
                <div className="flex items-center gap-2">{actions}</div>
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
        />
      )}
    </>
  );
}
