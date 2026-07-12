"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { generatePeriods } from "@/lib/actions/semesterActions";

/**
 * V01 — Génération en un clic des périodes manquantes d'un régime :
 * 3 trimestres, ou les compositions mensuelles d'octobre à juin.
 */
export default function GeneratePeriodsButton() {
  const [open, setOpen] = useState(false);
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
          </div>
        </>
      )}
    </div>
  );
}
