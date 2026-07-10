"use client";

import { useEffect, useMemo, useState, useActionState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, X, Users, Loader2, Search } from "lucide-react";
import { saveRollCall } from "@/lib/actions/attendanceAction";

type Option = { id: number; name: string };
type StudentRow = { id: string; name: string; surname: string };
type DirectoryRow = StudentRow & { classId: number; className: string };

/**
 * Grille d'appel : filtres (classe, matière, date, session) pilotés par l'URL,
 * toggles Présent/Absent par élève, enregistrement en masse via saveRollCall.
 */
const RollCallClient = ({
  classes,
  subjects,
  selectedClassId,
  selectedSubjectId,
  date,
  sessionDay,
  students,
  existing,
  directory,
  focusId,
}: {
  classes: Option[];
  subjects: Option[];
  selectedClassId: number | null;
  selectedSubjectId: number | null;
  date: string;
  sessionDay: "MORNING" | "EVENING";
  students: StudentRow[];
  existing: Record<string, boolean>;
  directory: DirectoryRow[];
  focusId: string | null;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  // Présence locale : préremplie par l'existant, défaut présent.
  const initial = useMemo(
    () =>
      Object.fromEntries(
        students.map((s) => [s.id, existing[s.id] ?? true])
      ) as Record<string, boolean>,
    [students, existing]
  );
  const [presence, setPresence] = useState<Record<string, boolean>>(initial);
  useEffect(() => setPresence(initial), [initial]);

  const [state, formAction] = useActionState(saveRollCall, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success && state.message) {
      toast(state.message);
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    if (key === "classId") params.delete("subjectId"); // matières dépendent de la classe
    router.push(`${pathname}?${params.toString()}`);
  };

  const presentCount = students.filter((s) => presence[s.id]).length;

  // Recherche d'élève : filtre la classe affichée + propose les élèves des
  // AUTRES classes (bascule automatique vers leur classe, élève surligné).
  const norm = (s: string) => s.toLowerCase().trim();
  const q = norm(search);
  const visibleStudents = q
    ? students.filter((s) => norm(`${s.name} ${s.surname}`).includes(q))
    : students;
  const crossMatches = q
    ? directory
        .filter(
          (s) =>
            s.classId !== selectedClassId &&
            norm(`${s.name} ${s.surname}`).includes(q)
        )
        .slice(0, 6)
    : [];

  const goToStudent = (s: DirectoryRow) => {
    const params = new URLSearchParams(window.location.search);
    params.set("classId", String(s.classId));
    params.delete("subjectId");
    params.set("focus", s.id);
    setSearch("");
    router.push(`${pathname}?${params.toString()}`);
  };

  const submit = () => {
    if (!selectedClassId || !selectedSubjectId) return;
    startTransition(() => {
      formAction({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        date,
        sessionDay,
        entries: students.map((s) => ({
          studentId: s.id,
          present: presence[s.id] ?? true,
        })),
      });
    });
  };

  const selectCls =
    "ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 bg-white outline-none focus:ring-2 focus:ring-lamaSky";

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Barre de contexte */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Classe</label>
          <select
            className={selectCls}
            value={selectedClassId ?? ""}
            onChange={(e) => setParam("classId", e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Matière</label>
          <select
            className={selectCls}
            value={selectedSubjectId ?? ""}
            onChange={(e) => setParam("subjectId", e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            className={selectCls}
            value={date}
            onChange={(e) => setParam("date", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Session</label>
          <select
            className={selectCls}
            value={sessionDay}
            onChange={(e) => setParam("session", e.target.value)}
          >
            <option value="MORNING">Matin</option>
            <option value="EVENING">Soir</option>
          </select>
        </div>
        {/* Recherche directe d'un élève (toutes classes autorisées) */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs text-gray-500">Rechercher un élève</label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom de l'élève…"
              className={`${selectCls} pl-8 w-48`}
            />
          </div>
          {crossMatches.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded-md shadow-lg ring-1 ring-gray-200 py-1 w-64">
              {crossMatches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStudent(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-lamaSkyLight"
                >
                  {s.name} {s.surname}
                  <span className="text-xs text-gray-400"> — {s.className}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          <Users size={16} />
          {presentCount}/{students.length} présents
        </div>
      </div>

      {/* Grille des élèves */}
      {students.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          Aucun élève dans cette classe (ou aucune classe/matière disponible).
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {visibleStudents.map((s) => {
            const present = presence[s.id] ?? true;
            const focused = focusId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setPresence((p) => ({ ...p, [s.id]: !present }))
                }
                className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm ring-1 transition ${
                  present
                    ? "bg-green-50 ring-green-200 text-green-800"
                    : "bg-red-50 ring-red-200 text-red-700"
                } ${focused ? "ring-2 ring-lamaSky shadow-md" : ""}`}
              >
                <span className="font-medium truncate">
                  {s.name} {s.surname}
                </span>
                <span
                  className={`ml-3 flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 ${
                    present ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {present ? <Check size={12} /> : <X size={12} />}
                  {present ? "Présent" : "Absent"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Enregistrement */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || students.length === 0}
          className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-md px-6 py-2.5 transition"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          Enregistrer l&apos;appel
        </button>
        <span className="text-xs text-gray-400">
          Ré-enregistrer le même appel met à jour les pointages existants
          (aucun doublon).
        </span>
      </div>
    </div>
  );
};

export default RollCallClient;
