"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; name: string };

/**
 * Filtres de l'écran stats élèves : selects Classe + Semestre pilotés par les
 * searchParams via router.push (même pattern que gradeEntry S12).
 */
export default function StatsFilters({
  classes,
  semesters,
  currentClassId,
  currentSemesterId,
}: {
  classes: Option[];
  semesters: Option[];
  currentClassId?: number;
  currentSemesterId?: number;
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
        name="classId"
        className="p-2 border border-gray-300 rounded-md text-sm"
        value={currentClassId ?? ""}
        onChange={(e) => handleChange("classId", e.target.value)}
      >
        {classes.length === 0 && <option value="">Aucune classe</option>}
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

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
    </div>
  );
}
