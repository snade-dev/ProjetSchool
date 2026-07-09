"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtres de la liste des présences : classe + jour, pilotés par l'URL.
 * (La recherche élève passe par la TableSearch existante, param ?search=.)
 */
const AttendanceFilters = ({
  classes,
  selectedClassId,
  date,
}: {
  classes: { id: number; name: string }[];
  selectedClassId?: number;
  date?: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const cls =
    "ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 bg-white outline-none focus:ring-2 focus:ring-lamaSky";

  return (
    <div className="flex items-center gap-2">
      <select
        className={cls}
        value={selectedClassId ?? ""}
        onChange={(e) => setParam("classId", e.target.value)}
        aria-label="Filtrer par classe"
      >
        <option value="">Toutes les classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        className={cls}
        value={date ?? ""}
        onChange={(e) => setParam("date", e.target.value)}
        aria-label="Filtrer par jour"
      />
      {(selectedClassId || date) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("classId");
            params.delete("date");
            params.delete("page");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          Effacer
        </button>
      )}
    </div>
  );
};

export default AttendanceFilters;
