"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const ExpenseFilters = ({
  month,
  year,
  categoryId,
  years,
  categories,
}: {
  month?: string;
  year?: string;
  categoryId?: string;
  years: number[];
  categories: { id: number; name: string }[];
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const selectClass =
    "px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-lamaYellow";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        defaultValue={month ?? ""}
        onChange={(e) => update("month", e.target.value)}
      >
        <option value="">Tous les mois</option>
        {MONTHS.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={year ?? ""}
        onChange={(e) => update("year", e.target.value)}
      >
        <option value="">Année</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={categoryId ?? ""}
        onChange={(e) => update("categoryId", e.target.value)}
      >
        <option value="">Toutes les catégories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ExpenseFilters;
