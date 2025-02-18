"use client";

import { useHandleFilterChange } from "./FonctionOnchange";
import { useSearchParams } from "next/navigation";

interface ClickableStudentNameProps {
  studentId: Number;
  studentName: string;
}

export default function ClickableStudentName({
  studentId,
  studentName,
}: ClickableStudentNameProps) {
  const handleFilterChange = useHandleFilterChange();
  const searchParams = useSearchParams();
  const isActive = searchParams.get("studentId") === studentId.toString();

  return (
    <button
      onClick={() =>
        handleFilterChange("studentId", isActive ? "" : studentId.toString())
      }
      className={`text-left ${
        isActive
          ? "text-blue-800 font-semibold underline"
          : "text-blue-600 hover:underline"
      }`}
    >
      {studentName}
      {isActive && " ✓"}
    </button>
  );
}