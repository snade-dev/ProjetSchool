"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * W10 — filtres du journal d'audit : module (préfixe d'action), utilisateur,
 * période (du/au) et — pour le superadmin uniquement — école.
 * Même pattern que ExpenseFilters : chaque changement réécrit les
 * searchParams et remet la pagination à la page 1.
 */
const AuditFilters = ({
  module,
  user,
  from,
  to,
  schoolId,
  modules,
  schools,
}: {
  module?: string;
  user?: string;
  from?: string;
  to?: string;
  schoolId?: string;
  /** Modules réellement présents dans le journal (préfixes d'action). */
  modules: string[];
  /** Écoles pour le filtre superadmin ([] pour admin/director). */
  schools: { id: number; name: string }[];
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

  const inputClass =
    "px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-lamaYellow";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {schools.length > 0 && (
        <select
          className={inputClass}
          defaultValue={schoolId ?? ""}
          onChange={(e) => update("schoolId", e.target.value)}
          title="École"
        >
          <option value="">Toutes les écoles</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      <select
        className={inputClass}
        defaultValue={module ?? ""}
        onChange={(e) => update("module", e.target.value)}
        title="Module (préfixe d'action)"
      >
        <option value="">Toutes les actions</option>
        {modules.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <input
        type="text"
        className={inputClass}
        defaultValue={user ?? ""}
        placeholder="Utilisateur…"
        onKeyDown={(e) => {
          if (e.key === "Enter") update("user", (e.target as HTMLInputElement).value.trim());
        }}
        onBlur={(e) => update("user", e.target.value.trim())}
      />

      <label className="flex items-center gap-1 text-xs text-gray-500">
        Du
        <input
          type="date"
          className={inputClass}
          defaultValue={from ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        au
        <input
          type="date"
          className={inputClass}
          defaultValue={to ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </label>

      {(module || user || from || to || schoolId) && (
        <button
          onClick={() => router.push("?")}
          className="px-3 py-2 rounded-md bg-gray-100 text-xs hover:bg-gray-200"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
};

export default AuditFilters;
