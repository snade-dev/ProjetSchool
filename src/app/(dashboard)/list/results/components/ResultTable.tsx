"use client";

import Table from "@/components/Table";
import { useState } from "react";
import StudentResultModal from "./StudentResultModal";
import { Prisma } from "@prisma/client";
import { getResults } from "./actions";

type ResultWithDetails = Prisma.ResultGetPayload<{
  include: {
    exam: { select: { id: true; title: true } };
    semester: { select: { id: true; name: true } };
    subject: { select: { id: true; name: true } };
    student: {
      select: {
        id: true;
        name: true;
        classId: true;
        class: { select: { name: true } };
      };
    };
  };
}>;
type ResultWithDetails2 = Prisma.ResultGetPayload<{
  include: {
    exam: { select: { id: true; title: true } };
    semester: { select: { id: true; name: true } };
    student: {
      select: {
        id: true;
        name: true;
        classId: true;
        class: { select: { name: true } };
      };
    };
  };
}>;

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

  const handleStudentClick = async (studentId: string) => {
    const results = await getResults(studentId);
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
          {
            header: "Examen",
            accessor: "exam",
            className: "hidden md:table-cell",
          },
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
          ...(role === "admin" || role === "teacher"
            ? [{ header: "Actions", accessor: "action" }]
            : []),
        ]}
        renderRow={(item: any) => (
          <tr
            key={item.id}
            className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
          >
            <td className="flex items-center gap-4 p-4">
              {item.exam?.title || "-"}
            </td>
            <td className="hidden md:table-cell">{item.student.name}</td>
            <td>{item.semester.name}</td>
            <td className="hidden md:table-cell">{item.student.class.name}</td>
            <td className="hidden md:table-cell">{moyenne}</td>
            <td className="hidden md:table-cell">
              <button
                onClick={() => handleStudentClick(item.student.id)}
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
        />
      )}
    </>
  );
}
