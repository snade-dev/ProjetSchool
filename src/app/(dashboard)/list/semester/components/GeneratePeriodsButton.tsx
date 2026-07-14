"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CalendarPlus, ChevronDown, X } from "lucide-react";
import {
  generatePeriods,
  generateCombinedPeriods,
} from "@/lib/actions/semesterActions";

/**
 * V01 — Génération en un clic des périodes manquantes d'un régime :
 * 3 trimestres, ou les compositions mensuelles d'octobre à juin.
 * W09 — + calendrier COMBINÉ (§2.3.1 système 3) : un dialogue propose le
 * nombre de trimestres, les mois de trimestre et les mois de composition ;
 * un mois de trimestre ne peut pas porter de composition (règle du cahier
 * des charges), la case correspondante est désactivée ET le serveur revalide.
 */

// Doit rester aligné sur EVAL_MONTH_NAMES du serveur (semesterActions).
const EVAL_MONTHS = [
  "octobre", "novembre", "décembre", "janvier",
  "février", "mars", "avril", "mai", "juin",
];
// Mois de trimestre proposés par défaut (fins de trimestre classiques au Mali).
const DEFAULT_TRIMESTER_MONTHS = ["décembre", "mars", "juin"];

function CombinedCalendarDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [trimesterCount, setTrimesterCount] = useState(3);
  const [trimesterMonths, setTrimesterMonths] = useState<string[]>(
    DEFAULT_TRIMESTER_MONTHS
  );
  // Compositions par défaut : tous les mois HORS mois de trimestre.
  const [compositionMonths, setCompositionMonths] = useState<string[]>(
    EVAL_MONTHS.filter((m) => !DEFAULT_TRIMESTER_MONTHS.includes(m))
  );

  const toggleTrimesterMonth = (m: string) =>
    setTrimesterMonths((prev) => {
      const next = prev.includes(m)
        ? prev.filter((x) => x !== m)
        : [...prev, m];
      // Un mois qui devient « de trimestre » perd sa composition (§2.3.1).
      if (!prev.includes(m)) {
        setCompositionMonths((c) => c.filter((x) => x !== m));
      }
      return next;
    });

  const toggleCompositionMonth = (m: string) =>
    setCompositionMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const submit = () =>
    startTransition(async () => {
      const res = await generateCombinedPeriods({
        trimesterCount,
        trimesterMonths,
        compositionMonths,
      });
      if (res.success) {
        toast(res.message);
        onDone();
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg p-5 w-full max-w-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Calendrier combiné (compositions + trimestres)
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Pour les classes en régime combiné (§2.3.1) : compositions
                mensuelles toute l&apos;année, SAUF les mois de trimestre.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md bg-gray-100 p-1.5 hover:bg-gray-200"
              title="Fermer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Nombre de trimestres */}
          <label className="mt-4 flex items-center gap-2 text-xs text-gray-600">
            Nombre de trimestres
            <select
              value={trimesterCount}
              onChange={(e) => setTrimesterCount(parseInt(e.target.value))}
              className="rounded-md ring-1 ring-gray-300 bg-white p-1.5 text-xs outline-none"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            <span className="text-gray-400">
              ({trimesterCount} mois de trimestre à choisir)
            </span>
          </label>

          {/* Mois de trimestre */}
          <p className="mt-3 text-xs font-medium text-gray-600">
            Mois de trimestre (composition trimestrielle — pas de composition
            mensuelle ce mois-là)
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {EVAL_MONTHS.map((m) => (
              <label
                key={`t-${m}`}
                className="flex items-center gap-1.5 rounded-md bg-lamaSkyLight/50 px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={trimesterMonths.includes(m)}
                  onChange={() => toggleTrimesterMonth(m)}
                />
                {m}
              </label>
            ))}
          </div>
          {trimesterMonths.length !== trimesterCount && (
            <p className="mt-1 text-xs text-amber-600">
              Choisissez exactement {trimesterCount} mois de trimestre (
              {trimesterMonths.length} coché
              {trimesterMonths.length > 1 ? "s" : ""}).
            </p>
          )}

          {/* Mois de composition */}
          <p className="mt-3 text-xs font-medium text-gray-600">
            Mois de composition mensuelle
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {EVAL_MONTHS.map((m) => {
              const isTrimesterMonth = trimesterMonths.includes(m);
              return (
                <label
                  key={`c-${m}`}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                    isTrimesterMonth
                      ? "bg-gray-100 text-gray-400"
                      : "bg-lamaYellowLight/60"
                  }`}
                  title={
                    isTrimesterMonth
                      ? "Mois de trimestre : pas de composition mensuelle (§2.3.1)"
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    disabled={isTrimesterMonth}
                    checked={compositionMonths.includes(m)}
                    onChange={() => toggleCompositionMonth(m)}
                  />
                  {m}
                  {isTrimesterMonth && <span className="ml-auto">🚫</span>}
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={isPending || trimesterMonths.length !== trimesterCount}
              className="rounded-md bg-blue-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-gray-300"
            >
              {isPending
                ? "Génération…"
                : `Générer ${trimesterCount} trimestres + ${compositionMonths.length} compositions`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePeriodsButton() {
  const [open, setOpen] = useState(false);
  const [combinedOpen, setCombinedOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (system: "TRIMESTER" | "MONTHLY") => {
    setOpen(false);
    startTransition(async () => {
      const res = await generatePeriods(system);
      if (res.success) {
        toast(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-xs font-semibold rounded-md px-3 py-2 transition"
      >
        <CalendarPlus size={14} />
        {isPending ? "Génération…" : "Générer les périodes"}
        <ChevronDown size={13} />
      </button>
      {open && (
        <>
          {/* clic hors menu = fermeture */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-100 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => run("TRIMESTER")}
              className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-lamaSkyLight"
            >
              <span className="font-semibold">3 trimestres</span>
              <span className="block text-gray-400">
                Trimestre 1 → 3 (classes en régime trimestriel)
              </span>
            </button>
            <button
              type="button"
              onClick={() => run("MONTHLY")}
              className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-lamaSkyLight"
            >
              <span className="font-semibold">Compositions mensuelles</span>
              <span className="block text-gray-400">
                Octobre → juin (classes en régime composition)
              </span>
            </button>
            {/* W09 — calendrier combiné (§2.3.1 système 3) */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCombinedOpen(true);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-lamaSkyLight"
            >
              <span className="font-semibold">Calendrier combiné…</span>
              <span className="block text-gray-400">
                Trimestres + compositions hors mois de trimestre (classes en
                régime combiné)
              </span>
            </button>
          </div>
        </>
      )}
      {combinedOpen && (
        <CombinedCalendarDialog
          onClose={() => setCombinedOpen(false)}
          onDone={() => {
            setCombinedOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
