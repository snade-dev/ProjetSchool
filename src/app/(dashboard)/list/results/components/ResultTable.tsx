"use client";

import Table from "@/components/Table";
import { useHandleFilterChange } from "./FonctionOnchange";
import { useSearchParams } from "next/navigation";
import ClickableStudentName from "./ClickableStudentName";

interface ResultTableProps {
  data: any[];
  role: string;
  actions?: React.ReactNode;
}

export default function ResultTable({ data, role, actions }: ResultTableProps) {
  const handleFilterChange = useHandleFilterChange();
  const searchParams = useSearchParams();
  const activeStudentId = searchParams.get("studentId");

  return (
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
          <td>
            <ClickableStudentName
              studentId={item.student.id}
              studentName={item.student.name}
            />
          </td>
          <td>{item.subject.name}</td>
          <td className="hidden md:table-cell">{item.score}</td>
          {actions && (
            <td>
              <div className="flex items-center gap-2">{actions}</div>
            </td>
          )}
        </tr>
      )}
      data={data}
    />
  );
}
