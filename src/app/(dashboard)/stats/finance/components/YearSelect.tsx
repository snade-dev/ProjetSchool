"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: number; name: string };

/**
 * Select « Année scolaire » du cockpit finance, piloté par le searchParam
 * `?schoolYearId=` via router.push (même pattern que les StatsFilters S14/S15).
 */
export default function YearSelect({
  years,
  currentYearId,
}: {
  years: Option[];
  currentYearId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("schoolYearId", value);
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      name="schoolYearId"
      className="p-2 border border-gray-300 rounded-md text-sm"
      value={currentYearId}
      onChange={(e) => handleChange(e.target.value)}
    >
      {years.map((y) => (
        <option key={y.id} value={y.id}>
          {y.name}
        </option>
      ))}
    </select>
  );
}
