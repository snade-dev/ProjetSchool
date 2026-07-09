"use client";

import { useRouter, useSearchParams } from "next/navigation";

const EmployeeFilters = ({ status }: { status?: string }) => {
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
        defaultValue={status ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">Tous les statuts</option>
        <option value="active">Actifs</option>
        <option value="inactive">Inactifs</option>
      </select>
    </div>
  );
};

export default EmployeeFilters;
