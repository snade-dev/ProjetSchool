"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * S13 — Sélecteur de semestre (à côté du bouton bulletin).
 * Change le param ?semesterId= de l'URL : le RSC parent recalcule le ReportCardData.
 */
const SemesterSelector = ({
  semesters,
  selectedId,
}: {
  semesters: { id: number; name: string }[];
  selectedId?: number;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("semesterId", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 bg-white"
      aria-label="Semestre du bulletin"
    >
      {semesters.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
};

export default SemesterSelector;
