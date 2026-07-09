"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

type Props = {
  /** Route handler cible : /api/export/{endpoint}. */
  endpoint: "invoices" | "expenses" | "payroll";
  /** Nom de fichier suggéré (le serveur fixe aussi Content-Disposition). */
  filename?: string;
  /** Params à forcer/ajouter par-dessus les searchParams courants (ex. schoolYearId sur E39). */
  params?: Record<string, string | undefined>;
  label?: string;
};

/**
 * Construit l'URL d'export à partir des filtres COURANTS de la page (mêmes clés
 * que la liste) puis ouvre le CSV. `useSearchParams` impose un composant client
 * sous <Suspense> en Next 16 (parade story-18).
 */
function ExportCsvLink({ endpoint, filename, params, label }: Props) {
  const searchParams = useSearchParams();
  const qs = new URLSearchParams(searchParams.toString());
  qs.delete("page"); // la pagination ne concerne pas l'export (toutes les lignes)

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === "") qs.delete(k);
      else qs.set(k, v);
    }
  }

  const query = qs.toString();
  const href = `/api/export/${endpoint}${query ? `?${query}` : ""}`;

  return (
    <a
      href={href}
      download={filename ? `${filename}.csv` : undefined}
      title="Exporter la sélection courante en CSV"
      className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
    >
      <Download size={16} />
      {label ?? "Exporter CSV"}
    </a>
  );
}

export default function ExportCsvButton(props: Props) {
  return (
    <Suspense
      fallback={
        <span className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-300">
          <Download size={16} />
          Exporter CSV
        </span>
      }
    >
      <ExportCsvLink {...props} />
    </Suspense>
  );
}
