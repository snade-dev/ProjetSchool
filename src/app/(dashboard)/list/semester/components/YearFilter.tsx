"use client";

import { useRouter, useSearchParams } from "next/navigation";

type YearOption = { id: number; name: string; isActive: boolean };

/**
 * W02 — filtre par année scolaire de l'écran Périodes. Piloté par le
 * searchParam `yearId` (même pattern que gradeEntry/components/Filters).
 * Sans sélection, la page affiche l'année ACTIVE.
 */
export default function YearFilter({
  years,
  selectedYearId,
}: {
  years: YearOption[];
  selectedYearId?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("yearId", value);
    else params.delete("yearId");
    params.delete("page"); // retour à la première page quand l'année change
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      name="yearId"
      className="p-2 border border-gray-300 rounded-md text-sm"
      value={selectedYearId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
    >
      {years.map((y) => (
        <option key={y.id} value={y.id}>
          {y.name}
          {y.isActive ? " (active)" : ""}
        </option>
      ))}
    </select>
  );
}
