"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; name: string };

/**
 * Barre de contexte sticky : 3 selects (Classe, Matière, Semestre) pilotés par les
 * searchParams via router.push (même pattern que makeupSession/.../ClientFilters).
 */
export default function Filters({
  classes,
  subjects,
  semesters,
  initialClassId,
  initialSubjectId,
  initialSemesterId,
}: {
  classes: Option[];
  subjects: Option[];
  semesters: Option[];
  initialClassId?: string;
  initialSubjectId?: string;
  initialSemesterId?: string;
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
        value={initialClassId || ""}
        onChange={(e) => handleChange("classId", e.target.value)}
      >
        <option value="">Choisir une classe</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        name="subjectId"
        className="p-2 border border-gray-300 rounded-md text-sm"
        value={initialSubjectId || ""}
        onChange={(e) => handleChange("subjectId", e.target.value)}
      >
        <option value="">Choisir une matière</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        name="semesterId"
        className="p-2 border border-gray-300 rounded-md text-sm"
        value={initialSemesterId || ""}
        onChange={(e) => handleChange("semesterId", e.target.value)}
      >
        <option value="">Choisir un semestre</option>
        {semesters.map((sem) => (
          <option key={sem.id} value={sem.id}>
            {sem.name}
          </option>
        ))}
      </select>
    </div>
  );
}
