"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  saveMealPointage,
  type MealPointageEntry,
} from "@/lib/actions/canteenAction";
import { Loader2, Save } from "lucide-react";

/**
 * X02 — Feuille de pointage du réfectoire (§2.5).
 * Une ligne par élève inscrit ; le choix par défaut vient du pointage déjà
 * enregistré, ou de l'abonnement (un abonné actif est présumé servi au forfait).
 * Le montant d'un repas à l'unité n'est JAMAIS envoyé par le client : l'action
 * serveur le lit sur la formule.
 */

export type PointageRow = {
  studentId: string;
  name: string;
  surname: string;
  username: string;
  className: string | null;
  planName: string | null;
  covered: boolean;
  unitPrice: number | null;
  kind: "SUBSCRIBED" | "EXTRA" | "ABSENT" | "NONE";
};

const KIND_OPTIONS: {
  value: PointageRow["kind"];
  label: string;
  className: string;
}[] = [
  { value: "SUBSCRIBED", label: "Forfait", className: "bg-green-100 text-green-800 border-green-300" },
  { value: "EXTRA", label: "À l'unité", className: "bg-lamaSky text-sky-900 border-sky-300" },
  { value: "ABSENT", label: "Absent", className: "bg-red-100 text-red-700 border-red-300" },
  { value: "NONE", label: "—", className: "bg-gray-100 text-gray-500 border-gray-300" },
];

const PointageTable = ({
  date,
  rows,
  canEdit,
}: {
  date: string;
  rows: PointageRow[];
  canEdit: boolean;
}) => {
  const [entries, setEntries] = useState<Record<string, PointageRow["kind"]>>(
    Object.fromEntries(rows.map((r) => [r.studentId, r.kind]))
  );

  // Changer de jour ou de classe recharge la page : on resynchronise l'état
  // sur les lignes reçues du serveur (sinon l'ancien pointage resterait affiché).
  useEffect(() => {
    setEntries(Object.fromEntries(rows.map((r) => [r.studentId, r.kind])));
  }, [rows]);

  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [state, formAction] = useActionState(saveMealPointage, {
    success: false,
    error: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setLoading(false);
      toast("Pointage enregistré !");
      router.refresh();
    } else if (state.error) {
      setLoading(false);
      toast.error("Erreur lors de l'enregistrement du pointage.");
    }
  }, [state, router]);

  const setKind = (studentId: string, kind: PointageRow["kind"]) =>
    setEntries((prev) => ({ ...prev, [studentId]: kind }));

  /** Applique un choix à toute la feuille (raccourci du réfectoire). */
  const setAll = (kind: PointageRow["kind"]) =>
    setEntries((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        // « Tous au forfait » ne concerne que les élèves réellement couverts.
        if (kind === "SUBSCRIBED" && !row.covered) continue;
        next[row.studentId] = kind;
      }
      return next;
    });

  const onSave = () => {
    setLoading(true);
    const payload: MealPointageEntry[] = rows.map((r) => ({
      studentId: r.studentId,
      kind: entries[r.studentId] ?? "NONE",
    }));
    startTransition(() => {
      formAction({ date, entries: payload });
    });
  };

  const served = rows.filter(
    (r) => entries[r.studentId] === "SUBSCRIBED" || entries[r.studentId] === "EXTRA"
  ).length;
  const extras = rows.filter((r) => entries[r.studentId] === "EXTRA");
  const extraTotal = extras.reduce((sum, r) => sum + (r.unitPrice ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
            {served} repas servis
          </span>
          <span className="rounded-full bg-lamaSky px-3 py-1 text-sky-900">
            {extras.length} à l&apos;unité ·{" "}
            {new Intl.NumberFormat("fr-FR").format(extraTotal)} FCFA
          </span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Tout marquer :</span>
            <button
              type="button"
              onClick={() => setAll("SUBSCRIBED")}
              className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs text-green-800 transition hover:bg-green-100"
            >
              Forfait
            </button>
            <button
              type="button"
              onClick={() => setAll("ABSENT")}
              className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 transition hover:bg-red-100"
            >
              Absent
            </button>
            <button
              type="button"
              onClick={() => setAll("NONE")}
              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-500 transition hover:bg-gray-100"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="p-3">Élève</th>
              <th className="p-3 hidden md:table-cell">Classe</th>
              <th className="p-3 hidden md:table-cell">Formule</th>
              <th className="p-3">Pointage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.studentId}
                className="border-b border-gray-100 even:bg-slate-50"
              >
                <td className="p-3">
                  <div className="font-medium">
                    {row.name} {row.surname}
                  </div>
                  <div className="text-xs text-gray-400">{row.username}</div>
                </td>
                <td className="p-3 hidden md:table-cell">
                  {row.className ?? "—"}
                </td>
                <td className="p-3 hidden md:table-cell">
                  {row.covered ? (
                    <span className="text-xs">{row.planName}</span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {row.planName ? `${row.planName} (inactif)` : "Non abonné"}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {KIND_OPTIONS.map((opt) => {
                      // Le forfait n'est proposé qu'aux élèves réellement couverts
                      // ce jour-là : sinon le repas est un extra, facturable.
                      if (opt.value === "SUBSCRIBED" && !row.covered) return null;
                      const on = (entries[row.studentId] ?? "NONE") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!canEdit}
                          aria-pressed={on}
                          onClick={() => setKind(row.studentId, opt.value)}
                          className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            on
                              ? `${opt.className} font-semibold`
                              : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="drawer-hero-bg flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {loading ? "Un instant…" : "Enregistrer le pointage"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PointageTable;
