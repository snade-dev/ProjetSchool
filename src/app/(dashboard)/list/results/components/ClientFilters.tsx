"use client";

import { Class, Semester } from "@prisma/client";
import { useHandleFilterChange } from "./FonctionOnchange";

export default function ClientFilters({
  classes,
  semesters,
  initialClassId,
  initialSemesterId,
}: {
  classes: Class[];
  semesters: Semester[];
  initialClassId?: string;
  initialSemesterId?: string;
}) {
  const handleFilterChange = useHandleFilterChange();

  return (
    <div className="flex gap-4">
      <select
        name="classId"
        className="p-2 border border-gray-300 rounded-md"
        value={initialClassId || ""}
        onChange={(e) => handleFilterChange("classId", e.target.value)}
      >
        <option value="">Sélectionner une classe</option>
        {classes.map((classe) => (
          <option key={classe.id} value={classe.id.toString()}>
            {classe.name}
          </option>
        ))}
      </select>

      <select
        name="semesterId"
        className="p-2 border border-gray-300 rounded-md"
        value={initialSemesterId || ""}
        onChange={(e) => handleFilterChange("semesterId", e.target.value)}
      >
        <option value="">Sélectionner un semestre</option>
        {semesters.map((semester) => (
          <option key={semester.id} value={semester.id.toString()}>
            {semester.name}
          </option>
        ))}
      </select>
    </div>
  );
}
