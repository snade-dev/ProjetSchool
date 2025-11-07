"use client";

import { Class, Semester, Exam } from "@/app/generated/prisma";
import { useHandleFilterChange } from "./FonctionOnchange";

export default function ClientFilters({
  classes,
  semesters,
  initialClassId,
  initialSemesterId,
  initialStudentId,
  initialExamId, // Ajout de l'examen sélectionné
}: {
  classes: Class[];
  semesters: Semester[];
  initialClassId?: string;
  initialSemesterId?: string;
  initialStudentId?: string;
  initialExamId?: string; // Ajout de l'ID d'examen initial
}) {
  const handleFilterChange = useHandleFilterChange();

  return (
    <div className="flex gap-4">
      {/* Filtre par Classe */}
      <select
        name="classId"
        className="p-2 border border-gray-300 rounded-md"
        value={initialClassId || ""}
        onChange={(e) => {
          handleFilterChange("classId", e.target.value);
          if (initialStudentId) {
            handleFilterChange("studentId", "");
          }
        }}
      >
        <option value="">Toutes les classes</option>
        {classes.map((classe) => (
          <option key={classe.id} value={classe.id}>
            {classe.name}
          </option>
        ))}
      </select>

      {/* Filtre par Semestre */}
      <select
        name="semesterId"
        className="p-2 border border-gray-300 rounded-md"
        value={initialSemesterId || ""}
        onChange={(e) => handleFilterChange("semesterId", e.target.value)}
      >
        <option value="">Tous les semestres</option>
        {semesters.map((semester) => (
          <option key={semester.id} value={semester.id}>
            {semester.name}
          </option>
        ))}
      </select>

      {/* Bouton pour Effacer le filtre Étudiant */}
      {initialStudentId && (
        <button
          onClick={() => handleFilterChange("studentId", "")}
          className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
        >
          Effacer le filtre étudiant ×
        </button>
      )}
    </div>
  );
}
