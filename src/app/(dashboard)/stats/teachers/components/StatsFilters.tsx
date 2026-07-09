"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; name: string };

/**
 * Filtres de l'écran stats enseignants : selects Semestre + Matière pilotés par
 * les searchParams via router.push (même pattern que StatsFilters de S14).
 * Le tri courant (?sort/?dir) est conservé lors d'un changement de filtre.
 */
export default function StatsFilters({
  semesters,
  subjects,
  currentSemesterId,
  currentSubjectId,
}: {
  semesters: Option[];
  subjects: Option[];
  currentSemesterId?: number;
  currentSubjectId?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4">
      <select
        name="semesterId"
        className="p-2 border border-gray-300 rounded-md text-sm"
        value={currentSemesterId ?? ""}
        onChange={(e) => handleChange("semesterId", e.target.value)}
      >
        {semesters.length === 0 && <option value="">Aucun semestre</option>}
        {semesters.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        name="subjectId"
        className="p-2 border border-gray-300 rounded-md text-sm"
        value={currentSubjectId ?? ""}
        onChange={(e) => handleChange("subjectId", e.target.value)}
      >
        <option value="">Toutes les matières</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
