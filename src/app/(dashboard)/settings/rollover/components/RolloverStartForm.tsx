"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CalendarPlus, ArrowRight } from "lucide-react";
import { createRolloverYear } from "@/lib/actions/rolloverAction";

type CandidateYear = {
  id: number;
  name: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
};

/**
 * W04 — Étape 1 de l'assistant : préparation de la nouvelle année scolaire
 * (création en statut non actif) OU reprise d'une année déjà préparée
 * (relance de l'assistant). Redirige vers ?target={id} pour les étapes 2→5.
 */
const RolloverStartForm = ({
  candidateYears,
}: {
  candidateYears: CandidateYear[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [existingId, setExistingId] = useState<number | "">("");

  const handleCreate = () => {
    if (!name || !startDate || !endDate) {
      toast.error("Renseignez le nom et les dates de la nouvelle année.");
      return;
    }
    startTransition(async () => {
      const res = await createRolloverYear({ name, startDate, endDate });
      if (res.success && res.yearId) {
        toast("Nouvelle année préparée (non active).");
        router.push(`/settings/rollover?target=${res.yearId}`);
      } else {
        toast.error(res.message ?? "Création impossible.");
      }
    });
  };

  const handleContinue = () => {
    if (!existingId) {
      toast.error("Sélectionnez une année cible.");
      return;
    }
    router.push(`/settings/rollover?target=${existingId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Créer la nouvelle année */}
      <div className="border border-gray-200 rounded-md p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CalendarPlus size={16} />
          Créer la nouvelle année
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Nom (ex : 2026-2027)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2026-2027"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreate}
          className="mt-2 self-start text-sm bg-blue-400 text-white py-2 px-4 rounded-md disabled:bg-slate-400"
        >
          {isPending ? "Création…" : "Créer et continuer"}
        </button>
        <p className="text-xs text-gray-400">
          L&apos;année est créée <b>non active</b> : la bascule est la dernière
          étape de l&apos;assistant.
        </p>
      </div>

      {/* Reprendre une année déjà préparée */}
      <div className="border border-gray-200 rounded-md p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ArrowRight size={16} />
          Continuer avec une année existante
        </h2>
        {candidateYears.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aucune année non active disponible.
          </p>
        ) : (
          <>
            <select
              value={existingId}
              onChange={(e) =>
                setExistingId(e.target.value ? Number(e.target.value) : "")
              }
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            >
              <option value="">— Choisir une année —</option>
              {candidateYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} ({y.startDate} → {y.endDate})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleContinue}
              className="self-start text-sm bg-blue-400 text-white py-2 px-4 rounded-md"
            >
              Continuer
            </button>
            <p className="text-xs text-gray-400">
              Utile pour reprendre un passage d&apos;année interrompu :
              l&apos;assistant ne duplique rien en cas de relance.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RolloverStartForm;
