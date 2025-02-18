"use client";

import Table from "@/components/Table";
import { useState } from "react";
import StudentResultModal from "./StudentResultModal";
import { Class, Semester } from "@prisma/client";
import ResultActions from "./ResultActions";

interface ResultTableProps {
  data: any[];
  role: string;
  classes: Class[];
  semesters: Semester[];
  subjects: any[];
}

export default function ResultTable({
  data,
  role,
  classes,
  semesters,
  subjects,
}: ResultTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
          { header: "Matière", accessor: "subject" },
          {
            header: "Note",
            accessor: "score",
            className: "hidden md:table-cell",
          },
          ...(role === "admin" || role === "teacher"
            ? [{ header: "Actions", accessor: "actions" }]
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
            <td>
              <button
                onClick={() =>
                  setSelectedStudent({
                    id: item.student.id,
                    name: item.student.name,
                  })
                }
                className="text-blue-600 hover:underline"
              >
                {item.student.name}
              </button>
            </td>
            <td>{item.subject.name}</td>
            <td className="hidden md:table-cell">{item.score}</td>
            {(role === "admin" || role === "teacher") && (
              <td>
                <ResultActions
                  item={item}
                  role={role}
                  subjects={subjects}
                  semesters={semesters}
                  classes={classes}
                />
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
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          classes={classes}
          semesters={semesters}
        />
      )}
    </>
  );
}
