"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatFCFA } from "@/lib/finance";
import { executeRollover } from "@/lib/actions/rolloverAction";
import type { RolloverSummary, RolloverDecisionKind } from "@/lib/rollover";

/**
 * W04 — Assistant de passage d'année, étapes 2→5 (l'étape 1, préparation de la
 * nouvelle année, vit dans RolloverStartForm). Les étapes collectent les
 * décisions côté client ; UNE validation serveur (executeRollover) applique
 * tout en transactions idempotentes.
 */

type Level = { id: number; name: string; order: number };

type SourceClass = {
  id: number;
  name: string;
  capacity: number;
  levelName: string | null;
  levelOrder: number | null;
  supervisorName: string | null;
  feeCount: number;
  activeCount: number;
  existsOnTarget: boolean;
};

type TargetClassOpt = {
  name: string;
  levelName: string | null;
  levelOrder: number | null;
};

type StudentRow = {
  id: string;
  fullName: string;
  classId: number;
  className: string;
  levelOrder: number | null;
  oldStatus: string; // statut actuel de l'inscription de l'année qui se clôt
  targetClassName: string | null; // déjà inscrit sur l'année cible (relance)
  balance: number; // impayés (FCFA) sur l'année qui se clôt
  arrearsDone: boolean; // facture d'arriérés déjà générée (relance)
};

type Decision = { decision: RolloverDecisionKind; targetClassName?: string };

type Props = {
  oldYear: { id: number; name: string };
  targetYear: { id: number; name: string };
  levels: Level[];
  sourceClasses: SourceClass[];
  targetClasses: TargetClassOpt[];
  students: StudentRow[];
};

const DECISION_LABELS: Record<RolloverDecisionKind, string> = {
  PROMOTE: "Passe",
  REPEAT: "Redouble",
  LEAVE: "Sort",
  GRADUATE: "Diplômé",
};

const STEPS = [
  { n: 1, label: "Nouvelle année" },
  { n: 2, label: "Classes" },
  { n: 3, label: "Élèves" },
  { n: 4, label: "Impayés" },
  { n: 5, label: "Bascule" },
];

/** Options de classes cibles = classes reconduites (cochées) ∪ classes déjà présentes sur l'année cible. */
const computeOptions = (
  checked: Set<number>,
  sourceClasses: SourceClass[],
  targetClasses: TargetClassOpt[]
): TargetClassOpt[] => {
  const byName = new Map<string, TargetClassOpt>();
  for (const t of targetClasses) byName.set(t.name, t);
  for (const c of sourceClasses) {
    if (checked.has(c.id) && !byName.has(c.name)) {
      byName.set(c.name, {
        name: c.name,
        levelName: c.levelName,
        levelOrder: c.levelOrder,
      });
    }
  }
  return [...byName.values()].sort(
    (a, b) =>
      (a.levelOrder ?? 999) - (b.levelOrder ?? 999) ||
      a.name.localeCompare(b.name)
  );
};

/** Niveau suivant (Level.order strictement supérieur le plus proche), ou null si dernier niveau. */
const nextOrder = (levels: Level[], order: number): number | null => {
  const above = levels
    .map((l) => l.order)
    .filter((o) => o > order)
    .sort((a, b) => a - b);
  return above[0] ?? null;
};

/** Décision par défaut d'un élève : « Passe » vers le niveau order+1 quand il existe,
 * « Diplômé » au dernier niveau, sinon reprise de l'issue déjà enregistrée (relance). */
const defaultDecision = (
  s: StudentRow,
  levels: Level[],
  options: TargetClassOpt[]
): Decision => {
  // Relance de l'assistant : reprendre l'état déjà écrit
  if (s.targetClassName) {
    return {
      decision: s.oldStatus === "REPEATED" ? "REPEAT" : "PROMOTE",
      targetClassName: s.targetClassName,
    };
  }
  if (s.oldStatus === "REPEATED")
    return { decision: "REPEAT", targetClassName: s.className };
  if (s.oldStatus === "LEFT") return { decision: "LEAVE" };
  if (s.oldStatus === "GRADUATED") return { decision: "GRADUATE" };

  // Cas nominal (inscription ACTIVE)
  if (s.levelOrder == null) {
    // Classe sans niveau : impossible de calculer le niveau suivant
    return { decision: "REPEAT", targetClassName: s.className };
  }
  const next = nextOrder(levels, s.levelOrder);
  if (next == null) return { decision: "GRADUATE" }; // dernier niveau
  const candidate = options.find((o) => o.levelOrder === next);
  return { decision: "PROMOTE", targetClassName: candidate?.name };
};

const statusBadge = (status: string) => {
  if (status === "ACTIVE") return null;
  const labels: Record<string, string> = {
    REPEATED: "redoublement enregistré",
    LEFT: "sortie enregistrée",
    GRADUATED: "diplôme enregistré",
  };
  return (
    <span className="text-[10px] bg-amber-100 text-amber-700 py-[2px] px-2 rounded-full">
      {labels[status] ?? status}
    </span>
  );
};

const RolloverWizard = ({
  oldYear,
  targetYear,
  levels,
  sourceClasses,
  targetClasses,
  students,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(2);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(sourceClasses.map((c) => c.id)) // cochées par défaut
  );
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const initialOptions = computeOptions(
      new Set(sourceClasses.map((c) => c.id)),
      sourceClasses,
      targetClasses
    );
    const map: Record<string, Decision> = {};
    for (const s of students) {
      map[s.id] = defaultDecision(s, levels, initialOptions);
    }
    return map;
  });
  const [carryArrears, setCarryArrears] = useState(true);
  const [copyPeriods, setCopyPeriods] = useState(true);
  const [activate, setActivate] = useState(true);
  const [summary, setSummary] = useState<RolloverSummary | null>(null);

  const options = useMemo(
    () => computeOptions(checked, sourceClasses, targetClasses),
    [checked, sourceClasses, targetClasses]
  );
  const optionNames = useMemo(
    () => new Set(options.map((o) => o.name)),
    [options]
  );

  // Groupes de l'étape 3 : élèves par classe (l'ordre suit sourceClasses)
  const groups = useMemo(() => {
    const byClass = new Map<number, StudentRow[]>();
    for (const s of students) {
      const arr = byClass.get(s.classId) ?? [];
      arr.push(s);
      byClass.set(s.classId, arr);
    }
    return sourceClasses
      .filter((c) => byClass.has(c.id))
      .map((c) => ({ cls: c, rows: byClass.get(c.id)! }));
  }, [students, sourceClasses]);

  // Lignes invalides : PROMOTE/REPEAT sans classe cible valide
  const invalidIds = useMemo(() => {
    const bad: string[] = [];
    for (const s of students) {
      const d = decisions[s.id];
      if (!d) continue;
      if (
        (d.decision === "PROMOTE" || d.decision === "REPEAT") &&
        (!d.targetClassName || !optionNames.has(d.targetClassName))
      ) {
        bad.push(s.id);
      }
    }
    return new Set(bad);
  }, [students, decisions, optionNames]);

  const counts = useMemo(() => {
    const c = { PROMOTE: 0, REPEAT: 0, LEAVE: 0, GRADUATE: 0 };
    for (const s of students) {
      const d = decisions[s.id];
      if (d) c[d.decision] += 1;
    }
    return c;
  }, [students, decisions]);

  // Étape 4 : impayés des élèves réinscrits (Passe/Redouble)
  const arrearsRows = useMemo(
    () =>
      students.filter((s) => {
        const d = decisions[s.id];
        return (
          s.balance > 0 &&
          d &&
          (d.decision === "PROMOTE" || d.decision === "REPEAT")
        );
      }),
    [students, decisions]
  );
  const arrearsTotal = arrearsRows
    .filter((s) => !s.arrearsDone)
    .reduce((sum, s) => sum + s.balance, 0);

  const setDecision = (studentId: string, d: Decision) =>
    setDecisions((prev) => ({ ...prev, [studentId]: d }));

  const changeKind = (s: StudentRow, kind: RolloverDecisionKind) => {
    if (kind === "LEAVE" || kind === "GRADUATE") {
      setDecision(s.id, { decision: kind });
      return;
    }
    if (kind === "REPEAT") {
      setDecision(s.id, {
        decision: "REPEAT",
        targetClassName: optionNames.has(s.className) ? s.className : undefined,
      });
      return;
    }
    // PROMOTE : classe du niveau order+1 par défaut quand elle existe
    let target: string | undefined;
    if (s.levelOrder != null) {
      const next = nextOrder(levels, s.levelOrder);
      if (next != null)
        target = options.find((o) => o.levelOrder === next)?.name;
    }
    setDecision(s.id, { decision: "PROMOTE", targetClassName: target });
  };

  const bulkApply = (classId: number, kind: RolloverDecisionKind) => {
    const rows = students.filter((s) => s.classId === classId);
    setDecisions((prev) => {
      const nextMap = { ...prev };
      for (const s of rows) {
        if (kind === "LEAVE" || kind === "GRADUATE") {
          nextMap[s.id] = { decision: kind };
        } else if (kind === "REPEAT") {
          nextMap[s.id] = {
            decision: "REPEAT",
            targetClassName: optionNames.has(s.className)
              ? s.className
              : undefined,
          };
        } else {
          let target: string | undefined;
          if (s.levelOrder != null) {
            const next = nextOrder(levels, s.levelOrder);
            if (next != null)
              target = options.find((o) => o.levelOrder === next)?.name;
          }
          nextMap[s.id] = { decision: "PROMOTE", targetClassName: target };
        }
      }
      return nextMap;
    });
  };

  const handleExecute = () => {
    if (invalidIds.size > 0) {
      toast.error(
        `${invalidIds.size} élève(s) sans classe cible valide — corrigez l'étape 3.`
      );
      setStep(3);
      return;
    }
    startTransition(async () => {
      const res = await executeRollover({
        oldYearId: oldYear.id,
        targetYearId: targetYear.id,
        classIdsToCopy: [...checked],
        decisions: students.map((s) => {
          const d = decisions[s.id];
          return {
            studentId: s.id,
            decision: d.decision,
            targetClassName:
              d.decision === "PROMOTE" || d.decision === "REPEAT"
                ? d.targetClassName
                : undefined,
          };
        }),
        carryArrears,
        copyPeriods,
        activate,
      });
      if (res.success && res.summary) {
        setSummary(res.summary);
        toast("Passage d'année exécuté.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  // ---- Résumé final après validation ----
  if (summary) {
    return (
      <div className="bg-white p-6 rounded-md flex flex-col gap-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Check className="text-green-500" size={20} />
          Passage d&apos;année exécuté : {oldYear.name} → {targetYear.name}
        </h1>
        <ul className="text-sm text-gray-700 list-disc pl-6 flex flex-col gap-1">
          <li>
            {summary.classesCreated} classe(s) créée(s) sur {targetYear.name}
            {summary.classesExisting > 0 &&
              ` (${summary.classesExisting} existai(en)t déjà)`}
            , {summary.feesCopied} frais reconduits
          </li>
          <li>
            {summary.promoted} élève(s) passé(s), {summary.repeated}{" "}
            redoublement(s), {summary.left} sortie(s), {summary.graduated}{" "}
            diplômé(s)
          </li>
          <li>
            {summary.arrearsCreated} facture(s) d&apos;arriérés (
            {formatFCFA(summary.arrearsTotal)}) —{" "}
            {summary.cancelledInvoices} ancienne(s) facture(s) annulée(s)
            {summary.arrearsSkipped > 0 &&
              `, ${summary.arrearsSkipped} déjà reportée(s)`}
          </li>
          <li>{summary.periodsCreated} période(s) d&apos;évaluation reconduite(s)</li>
          <li>
            {summary.activated
              ? `${targetYear.name} est désormais l'année ACTIVE.`
              : "La bascule n'a pas été effectuée (année cible non activée)."}
          </li>
        </ul>
        <div className="flex gap-3">
          <Link
            href="/settings"
            className="text-sm bg-blue-400 text-white py-2 px-4 rounded-md"
          >
            Retour aux paramètres
          </Link>
          <Link
            href="/list/classes"
            className="text-sm border border-gray-300 py-2 px-4 rounded-md"
          >
            Voir les classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-md flex flex-col gap-6">
      {/* En-tête + fil d'étapes */}
      <div>
        <h1 className="text-lg font-semibold">
          Passage d&apos;année : {oldYear.name} → {targetYear.name}
        </h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              disabled={s.n === 1}
              onClick={() => s.n > 1 && setStep(s.n)}
              className={`flex items-center gap-2 text-xs py-1 px-3 rounded-full border ${
                s.n === 1
                  ? "border-green-300 bg-green-50 text-green-700"
                  : step === s.n
                    ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s.n === 1 ? <Check size={12} /> : <span>{s.n}.</span>}
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Rien n&apos;est écrit avant la validation finale (étape 5).{" "}
          <Link href="/settings/rollover" className="underline">
            Changer d&apos;année cible
          </Link>
        </p>
      </div>

      {/* Étape 2 — Reconduction des classes */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            Classes de {oldYear.name} à recréer sur {targetYear.name}
          </h2>
          <p className="text-xs text-gray-500">
            Même nom, même niveau, même professeur principal, même capacité ;
            la grille des frais de chaque classe est reconduite aussi.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="p-2">
                    <input
                      type="checkbox"
                      checked={checked.size === sourceClasses.length}
                      onChange={(e) =>
                        setChecked(
                          e.target.checked
                            ? new Set(sourceClasses.map((c) => c.id))
                            : new Set()
                        )
                      }
                    />
                  </th>
                  <th className="p-2">Classe</th>
                  <th className="p-2">Niveau</th>
                  <th className="p-2 hidden md:table-cell">Prof. principal</th>
                  <th className="p-2 hidden md:table-cell">Capacité</th>
                  <th className="p-2">Élèves</th>
                  <th className="p-2 hidden md:table-cell">Frais</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {sourceClasses.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 even:bg-slate-50"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={checked.has(c.id)}
                        onChange={(e) =>
                          setChecked((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2">{c.levelName ?? "—"}</td>
                    <td className="p-2 hidden md:table-cell">
                      {c.supervisorName ?? "—"}
                    </td>
                    <td className="p-2 hidden md:table-cell">{c.capacity}</td>
                    <td className="p-2">{c.activeCount}</td>
                    <td className="p-2 hidden md:table-cell">{c.feeCount}</td>
                    <td className="p-2">
                      {c.existsOnTarget && (
                        <span className="text-[10px] bg-green-100 text-green-700 py-[2px] px-2 rounded-full">
                          déjà reconduite
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Étape 3 — Passage des élèves */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-semibold">
              Décision par élève ({students.length} inscrits sur {oldYear.name})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              « Passe » propose la classe du niveau suivant quand elle existe
              sur {targetYear.name} ; « Redouble » réinscrit au même niveau ;
              « Sort » et « Diplômé » clôturent sans réinscription.
            </p>
            {invalidIds.size > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {invalidIds.size} élève(s) sans classe cible valide (lignes en
                rouge) — choisissez une classe reconduite à l&apos;étape 2.
              </p>
            )}
          </div>

          {groups.map(({ cls, rows }) => (
            <div key={cls.id} className="border border-gray-200 rounded-md">
              <div className="flex items-center justify-between flex-wrap gap-2 p-2 bg-slate-50 rounded-t-md">
                <span className="text-sm font-semibold">
                  {cls.name}
                  {cls.levelName && (
                    <span className="text-xs text-gray-500 font-normal">
                      {" "}
                      · {cls.levelName}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 font-normal">
                    {" "}
                    ({rows.length} élève(s))
                  </span>
                </span>
                <div className="flex gap-1 flex-wrap">
                  {(
                    ["PROMOTE", "REPEAT", "LEAVE", "GRADUATE"] as const
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => bulkApply(cls.id, k)}
                      className="text-[11px] border border-gray-300 py-1 px-2 rounded-md hover:bg-lamaSkyLight"
                    >
                      Tous : {DECISION_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((s) => {
                    const d = decisions[s.id];
                    const needsTarget =
                      d.decision === "PROMOTE" || d.decision === "REPEAT";
                    const invalid = invalidIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`border-t border-gray-100 ${
                          invalid ? "bg-red-50" : "even:bg-slate-50"
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {s.fullName}
                            {statusBadge(s.oldStatus)}
                            {s.targetClassName && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 py-[2px] px-2 rounded-full">
                                déjà inscrit : {s.targetClassName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 w-36">
                          <select
                            value={d.decision}
                            onChange={(e) =>
                              changeKind(
                                s,
                                e.target.value as RolloverDecisionKind
                              )
                            }
                            className="ring-1 ring-gray-300 p-1 rounded-md text-xs w-full"
                          >
                            {(
                              ["PROMOTE", "REPEAT", "LEAVE", "GRADUATE"] as const
                            ).map((k) => (
                              <option key={k} value={k}>
                                {DECISION_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 w-52">
                          {needsTarget ? (
                            <select
                              value={d.targetClassName ?? ""}
                              onChange={(e) =>
                                setDecision(s.id, {
                                  decision: d.decision,
                                  targetClassName: e.target.value || undefined,
                                })
                              }
                              className={`ring-1 p-1 rounded-md text-xs w-full ${
                                invalid ? "ring-red-400" : "ring-gray-300"
                              }`}
                            >
                              <option value="">— classe cible —</option>
                              {options.map((o) => (
                                <option key={o.name} value={o.name}>
                                  {o.name}
                                  {o.levelName ? ` (${o.levelName})` : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">
                              pas de réinscription
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Étape 4 — Report des impayés */}
      {step === 4 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            Impayés de {oldYear.name} des élèves réinscrits
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={carryArrears}
              onChange={(e) => setCarryArrears(e.target.checked)}
            />
            Reporter les impayés : une facture « Arriérés {oldYear.name} » par
            élève sur {targetYear.name}, les anciennes factures passent en
            ANNULÉE avec note.
          </label>
          {arrearsRows.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucun impayé chez les élèves réinscrits.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="p-2">Élève</th>
                    <th className="p-2">Classe {oldYear.name}</th>
                    <th className="p-2">Solde dû</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {arrearsRows.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 even:bg-slate-50"
                    >
                      <td className="p-2">{s.fullName}</td>
                      <td className="p-2">{s.className}</td>
                      <td className="p-2 font-medium">
                        {formatFCFA(s.balance)}
                      </td>
                      <td className="p-2">
                        {s.arrearsDone && (
                          <span className="text-[10px] bg-green-100 text-green-700 py-[2px] px-2 rounded-full">
                            déjà reporté
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm">
                Total à reporter :{" "}
                <b>{carryArrears ? formatFCFA(arrearsTotal) : formatFCFA(0)}</b>
              </p>
            </>
          )}
        </div>
      )}

      {/* Étape 5 — Bascule + validation */}
      {step === 5 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Récapitulatif</h2>
          <ul className="text-sm text-gray-700 list-disc pl-6 flex flex-col gap-1">
            <li>
              {checked.size} classe(s) reconduite(s) sur {targetYear.name}
            </li>
            <li>
              {counts.PROMOTE} passage(s), {counts.REPEAT} redoublement(s),{" "}
              {counts.LEAVE} sortie(s), {counts.GRADUATE} diplômé(s)
            </li>
            <li>
              Impayés :{" "}
              {carryArrears
                ? `${arrearsRows.filter((s) => !s.arrearsDone).length} facture(s) d'arriérés (${formatFCFA(arrearsTotal)})`
                : "non reportés"}
            </li>
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyPeriods}
              onChange={(e) => setCopyPeriods(e.target.checked)}
            />
            Reconduire les périodes d&apos;évaluation de {oldYear.name} sur{" "}
            {targetYear.name}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
            />
            Basculer : {targetYear.name} devient l&apos;année active (
            {oldYear.name} est archivée, données intactes)
          </label>
          {invalidIds.size > 0 && (
            <p className="text-xs text-red-500">
              Validation impossible : {invalidIds.size} élève(s) sans classe
              cible valide à l&apos;étape 3.
            </p>
          )}
          <button
            type="button"
            disabled={isPending || invalidIds.size > 0}
            onClick={handleExecute}
            className="self-start text-sm bg-blue-400 text-white py-2 px-6 rounded-md disabled:bg-slate-400"
          >
            {isPending ? "Exécution…" : "Valider le passage d'année"}
          </button>
          <p className="text-xs text-gray-400">
            L&apos;opération est idempotente : la relancer ne duplique ni
            classes, ni inscriptions, ni factures.
          </p>
        </div>
      )}

      {/* Navigation bas de page */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          disabled={step <= 2}
          onClick={() => setStep((s) => Math.max(2, s - 1))}
          className="flex items-center gap-1 text-sm border border-gray-300 py-2 px-4 rounded-md disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Précédent
        </button>
        <button
          type="button"
          disabled={step >= 5}
          onClick={() => setStep((s) => Math.min(5, s + 1))}
          className="flex items-center gap-1 text-sm bg-blue-400 text-white py-2 px-4 rounded-md disabled:opacity-40"
        >
          Suivant <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default RolloverWizard;
