"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AlertTriangle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  addClassSubject,
  regenerateClassBulletins,
  removeClassSubject,
  updateCoefficient,
  updateHomeworkWeight,
  type ImpactedPeriod,
} from "@/lib/actions/classSubjectAction";

/**
 * W08 — section « Matières & coefficients » d'une classe (§2.1.6) :
 * liste des matières avec coefficient éditable, ajout/retrait d'une matière,
 * dialogue de confirmation listant les bulletins impactés quand un coefficient
 * change en cours d'année (règle critique §2.1.6), bannière « À régénérer »
 * + bouton de régénération des bulletins périmés.
 * W09 — + pondération devoirs/composition de la classe (homeworkWeight, %),
 * même flux de confirmation/stale : seuls les bulletins des périodes
 * TRIMESTER sont impactés (les compositions mensuelles ne pondèrent pas).
 */

export type ClassSubjectRow = {
  id: number;
  coefficient: number;
  subject: { id: number; name: string };
};

export type SubjectOption = { id: number; name: string };

const EMPTY_STATE = { success: false, error: false, message: "" };

/** Dialogue de confirmation (2e temps) : liste des bulletins impactés. */
function ConfirmDialog({
  description,
  periods,
  total,
  pending,
  onConfirm,
  onCancel,
}: {
  /** Phrase décrivant le changement (coefficient W08 ou pondération W09). */
  description: ReactNode;
  periods: ImpactedPeriod[];
  total: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
            <div>
              <h2 className="text-base font-semibold">
                Des bulletins existent déjà
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {description} <b>{total} bulletin(s)</b> seront marqués « À
                régénérer » :
              </p>
            </div>
          </div>
          <ul className="mt-3 max-h-40 overflow-y-auto rounded-md bg-amber-50 p-3 text-sm text-gray-700">
            {periods.map((p) => (
              <li key={p.semesterId} className="flex justify-between py-0.5">
                <span>{p.semesterName}</span>
                <span className="font-medium">{p.bulletins} élève(s)</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Après confirmation, utilisez le bouton « Régénérer les bulletins »
            pour recalculer les moyennes et les rangs avec le nouveau barème.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={pending}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Confirmer le changement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ClassSubjectSection = ({
  classId,
  weighted,
  homeworkWeight,
  classSubjects,
  subjects,
  staleCount,
}: {
  classId: number;
  weighted: boolean;
  /** W09 — pondération devoirs/composition actuelle de la classe (%). */
  homeworkWeight: number;
  classSubjects: ClassSubjectRow[];
  subjects: SubjectOption[];
  staleCount: number;
}) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCoefficient, setEditCoefficient] = useState(1);
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newCoefficient, setNewCoefficient] = useState(1);
  // W09 — édition de la pondération devoirs/composition
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightValue, setWeightValue] = useState(homeworkWeight);
  // Confirmation générique (coefficient W08 ou pondération W09) : description
  // du changement + périodes impactées + action du 2e temps (confirmed=true).
  const [confirmData, setConfirmData] = useState<{
    description: ReactNode;
    periods: ImpactedPeriod[];
    total: number;
    confirm: () => void;
  } | null>(null);

  // Matières de l'école pas encore rattachées à la classe
  const availableSubjects = subjects.filter(
    (s) => !classSubjects.some((cs) => cs.subject.id === s.id)
  );

  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast(res.message || "Matières de la classe mises à jour !");
        setAdding(false);
        setEditingId(null);
        setEditingWeight(false);
        setConfirmData(null);
        router.refresh();
      } else {
        toast.error(res.message || "Une erreur s'est produite");
      }
    });

  const submitAdd = () => {
    if (!newSubjectId) {
      toast.error("Choisissez une matière.");
      return;
    }
    run(() =>
      addClassSubject(EMPTY_STATE, {
        classId,
        subjectId: parseInt(newSubjectId),
        coefficient: newCoefficient,
      })
    );
  };

  // 1er temps : tentative sans confirmation — le serveur renvoie la liste des
  // bulletins impactés s'il y en a (règle critique §2.1.6).
  const submitEdit = (row: ClassSubjectRow) =>
    startTransition(async () => {
      const to = editCoefficient;
      const res = await updateCoefficient(EMPTY_STATE, {
        id: row.id,
        classId,
        subjectId: row.subject.id,
        coefficient: to,
      });
      if (res.requiresConfirmation) {
        setConfirmData({
          description: (
            <>
              Changer le coefficient de <b>{row.subject.name}</b> (
              {row.coefficient} → {to}) modifie les moyennes déjà calculées.
            </>
          ),
          periods: res.impactedPeriods ?? [],
          total: res.totalBulletins ?? 0,
          // 2e temps : confirmation explicite → écriture + marquage stale.
          confirm: () =>
            run(() =>
              updateCoefficient(EMPTY_STATE, {
                id: row.id,
                classId,
                subjectId: row.subject.id,
                coefficient: to,
                confirmed: true,
              })
            ),
        });
      } else if (res.success) {
        toast(res.message || "Coefficient mis à jour !");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(res.message || "Une erreur s'est produite");
      }
    });

  // W09 — pondération devoirs/composition : même flux en deux temps que les
  // coefficients (les bulletins TRIMESTER existants passent stale à la
  // confirmation ; les compositions MONTHLY ne sont jamais impactées).
  const submitWeight = () =>
    startTransition(async () => {
      const to = weightValue;
      const res = await updateHomeworkWeight(EMPTY_STATE, {
        classId,
        homeworkWeight: to,
      });
      if (res.requiresConfirmation) {
        setConfirmData({
          description: (
            <>
              Changer la pondération devoirs/composition ({homeworkWeight} % →{" "}
              {to} % pour les devoirs) modifie les moyennes déjà calculées des
              trimestres.
            </>
          ),
          periods: res.impactedPeriods ?? [],
          total: res.totalBulletins ?? 0,
          confirm: () =>
            run(() =>
              updateHomeworkWeight(EMPTY_STATE, {
                classId,
                homeworkWeight: to,
                confirmed: true,
              })
            ),
        });
      } else if (res.success) {
        toast(res.message || "Pondération mise à jour !");
        setEditingWeight(false);
        router.refresh();
      } else {
        toast.error(res.message || "Une erreur s'est produite");
      }
    });

  const submitRemove = (row: ClassSubjectRow) => {
    const warning =
      weighted && row.coefficient !== 1
        ? `Retirer ${row.subject.name} de la classe ?\n\nSon coefficient (${row.coefficient}) retombera à 1 : les bulletins déjà calculés seront marqués « À régénérer ».`
        : `Retirer ${row.subject.name} de la classe ?`;
    if (!window.confirm(warning)) return;
    const fd = new FormData();
    fd.set("id", String(row.id));
    run(() => removeClassSubject(EMPTY_STATE, fd));
  };

  const submitRegenerate = () => {
    const fd = new FormData();
    fd.set("classId", String(classId));
    run(() => regenerateClassBulletins(EMPTY_STATE, fd));
  };

  return (
    <div className="mt-4">
      {/* Bannière bulletins périmés + bouton Régénérer */}
      {staleCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 ring-1 ring-amber-200 p-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} />
            <span>
              <b>{staleCount} bulletin(s)</b> à régénérer suite à une
              correction de coefficient ou de pondération.
            </span>
          </div>
          <button
            onClick={submitRegenerate}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
            Régénérer les bulletins
          </button>
        </div>
      )}

      {/* W09 — pondération devoirs/composition (%) : ne joue que sur les
          moyennes des périodes TRIMESTER (classes TRIMESTER et COMBINED). */}
      {weighted && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-lamaSkyLight/40 ring-1 ring-lamaSky/30 p-3">
          <div className="text-sm">
            <p className="font-medium">
              Pondération devoirs / composition (trimestres)
            </p>
            {editingWeight ? (
              <label className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                Poids des devoirs (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weightValue}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setWeightValue(
                      Number.isNaN(v) ? 0 : Math.min(100, Math.max(0, v))
                    );
                  }}
                  className="w-20 rounded-md ring-1 ring-gray-300 bg-white p-1.5 text-sm outline-none"
                />
                <span className="text-gray-400">
                  → devoirs {weightValue} % · composition {100 - weightValue} %
                </span>
              </label>
            ) : (
              <p className="text-xs text-gray-500">
                Moyenne matière = devoirs × {homeworkWeight} % + composition ×{" "}
                {100 - homeworkWeight} %
                {homeworkWeight === 50 ? " (moyenne simple)" : ""} — les
                compositions mensuelles ne sont pas concernées.
              </p>
            )}
          </div>
          {editingWeight ? (
            <div className="flex items-center gap-2">
              <button
                onClick={submitWeight}
                disabled={pending}
                className="rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setEditingWeight(false);
                  setWeightValue(homeworkWeight);
                }}
                className="rounded-md bg-gray-100 p-1.5 hover:bg-gray-200"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingWeight(true);
                setWeightValue(homeworkWeight);
              }}
              className="flex items-center gap-1.5 rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90"
            >
              <Pencil size={13} /> Modifier
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold">
          Matières de la classe ({classSubjects.length})
        </h2>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1 rounded-md bg-lamaYellow px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            <Plus size={14} /> Ajouter une matière
          </button>
        )}
      </div>

      {classSubjects.length === 0 ? (
        <p className="text-sm text-gray-400">
          Aucune matière rattachée à cette classe. Les matières notées sans
          rattachement comptent avec un coefficient 1.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="p-2">Matière</th>
              <th className="p-2">Coefficient</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classSubjects.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 even:bg-slate-50"
              >
                <td className="p-2 font-medium">{row.subject.name}</td>
                {editingId === row.id ? (
                  <>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={editCoefficient}
                        onChange={(e) =>
                          setEditCoefficient(parseInt(e.target.value) || 1)
                        }
                        className="w-20 rounded-md ring-1 ring-gray-300 p-1.5 text-sm outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => submitEdit(row)}
                          disabled={pending}
                          className="rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-md bg-gray-100 p-1.5 hover:bg-gray-200"
                          title="Annuler"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2">
                      <span className="inline-block min-w-[2rem] rounded-full bg-lamaSkyLight px-2 py-0.5 text-center font-semibold">
                        {row.coefficient}
                      </span>
                      {!weighted && (
                        <span className="ml-2 text-xs text-gray-400">
                          (non pondéré en régime mensuel)
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(row.id);
                            setAdding(false);
                            setEditCoefficient(row.coefficient);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
                          title="Modifier le coefficient"
                        >
                          <Pencil size={14} className="text-white" />
                        </button>
                        <button
                          onClick={() => submitRemove(row)}
                          disabled={pending}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 disabled:opacity-50"
                          title="Retirer de la classe"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <div className="mt-3 rounded-md bg-lamaSkyLight/50 p-3 flex flex-wrap items-center gap-3">
          <select
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            className="rounded-md ring-1 ring-gray-300 bg-white p-2 text-xs outline-none min-w-[220px]"
          >
            <option value="">— Choisir une matière —</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Coefficient
            <input
              type="number"
              min={1}
              max={20}
              value={newCoefficient}
              onChange={(e) =>
                setNewCoefficient(parseInt(e.target.value) || 1)
              }
              className="w-20 rounded-md ring-1 ring-gray-300 p-1.5 text-sm outline-none"
            />
          </label>
          <button
            onClick={submitAdd}
            disabled={pending}
            className="rounded-md bg-lamaSky px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            Ajouter
          </button>
          <button
            onClick={() => setAdding(false)}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
          >
            Annuler
          </button>
        </div>
      )}

      {confirmData && (
        <ConfirmDialog
          description={confirmData.description}
          periods={confirmData.periods}
          total={confirmData.total}
          pending={pending}
          onConfirm={confirmData.confirm}
          onCancel={() => setConfirmData(null)}
        />
      )}
    </div>
  );
};

export default ClassSubjectSection;
