"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Image from "next/image";
import { Save } from "lucide-react";
import { saveGrades } from "@/lib/actions/gradeEntryAction";

type StudentRow = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
};

type ExistingGrade = {
  studentId: string;
  score: number;
  classScore: number | null;
};

type CellState = { score: string; classScore: string };

// Un champ est invalide s'il est renseigné mais hors [0;20] ou non numérique.
function isInvalid(v: string): boolean {
  if (v.trim() === "") return false;
  const n = Number(v);
  return Number.isNaN(n) || n < 0 || n > 20;
}

// Moyenne (H17) : (classScore + score)/2 si les deux existent, sinon la note présente.
function average(score: string, classScore: string): number | null {
  const s = score.trim() === "" ? null : Number(score);
  const c = classScore.trim() === "" ? null : Number(classScore);
  const valid = (x: number | null) => x !== null && !Number.isNaN(x);
  if (valid(s) && valid(c)) return ((s as number) + (c as number)) / 2;
  if (valid(s)) return s;
  if (valid(c)) return c;
  return null;
}

function avgColor(avg: number | null): string {
  if (avg === null) return "text-gray-300";
  if (avg < 10) return "text-red-600";
  if (avg <= 12) return "text-yellow-600";
  return "text-green-600";
}

export default function GradeGrid({
  students,
  existing,
  classId,
  subjectId,
  semesterId,
}: {
  students: StudentRow[];
  existing: ExistingGrade[];
  classId: number;
  subjectId: number;
  semesterId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initial = useMemo(() => {
    const map: Record<string, CellState> = {};
    const byId = new Map(existing.map((e) => [e.studentId, e]));
    for (const st of students) {
      const e = byId.get(st.id);
      map[st.id] = {
        score: e ? String(e.score) : "",
        classScore: e && e.classScore !== null ? String(e.classScore) : "",
      };
    }
    return map;
  }, [students, existing]);

  const [grades, setGrades] = useState<Record<string, CellState>>(initial);

  // Réinitialiser quand la sélection (classe/matière/semestre) change → nouvelles props.
  useEffect(() => {
    setGrades(initial);
  }, [initial]);

  const [state, formAction] = useActionState(saveGrades, {
    success: false,
    error: false,
    message: "",
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Erreur lors de l'enregistrement.");
    }
  }, [state, router]);

  const setCell = (studentId: string, field: keyof CellState, value: string) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  // Y a-t-il au moins une cellule invalide ? (bloque le submit)
  const hasError = useMemo(
    () =>
      Object.values(grades).some(
        (c) => isInvalid(c.score) || isInvalid(c.classScore)
      ),
    [grades]
  );

  // Compteur « X/Y saisies » : X = élèves ayant une note d'examen (seules lignes écrites).
  const filledCount = useMemo(
    () => Object.values(grades).filter((c) => c.score.trim() !== "").length,
    [grades]
  );

  const onSubmit = () => {
    if (hasError) return;
    const payload = {
      classId,
      subjectId,
      semesterId,
      grades: students.map((st) => {
        const c = grades[st.id];
        return {
          studentId: st.id,
          score: c.score.trim() === "" ? undefined : Number(c.score),
          classScore:
            c.classScore.trim() === "" ? undefined : Number(c.classScore),
        };
      }),
    };
    startTransition(() => {
      formAction(payload);
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{filledCount}</span>/
          {students.length} notes saisies
        </span>
        {hasError && (
          <span className="text-xs text-red-600">
            Notes hors [0;20] : corrigez avant d'enregistrer.
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="py-2 px-2">Élève</th>
              <th className="py-2 px-2 w-32">Note d'examen /20</th>
              <th className="py-2 px-2 w-32">Note de classe /20</th>
              <th className="py-2 px-2 w-28">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const c = grades[st.id] ?? { score: "", classScore: "" };
              const avg = average(c.score, c.classScore);
              const scoreBad = isInvalid(c.score);
              const classBad = isInvalid(c.classScore);
              return (
                <tr
                  key={st.id}
                  className="border-b even:bg-slate-50 hover:bg-lamaPurpleLight"
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <Image
                        src={st.img || "/noAvatar.png"}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span>
                        {st.name} {st.surname}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step="0.01"
                      value={c.score}
                      onChange={(e) => setCell(st.id, "score", e.target.value)}
                      title={scoreBad ? "Note hors [0;20]" : undefined}
                      className={`w-24 p-1 border rounded-md ${
                        scoreBad ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step="0.01"
                      value={c.classScore}
                      onChange={(e) =>
                        setCell(st.id, "classScore", e.target.value)
                      }
                      title={classBad ? "Note hors [0;20]" : undefined}
                      className={`w-24 p-1 border rounded-md ${
                        classBad ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>
                  <td className={`py-2 px-2 font-semibold ${avgColor(avg)}`}>
                    {avg === null ? "—" : avg.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-4 bg-white/90 backdrop-blur py-3 border-t">
        <span className="text-xs text-gray-400">
          Seules les lignes avec une note d'examen sont enregistrées.
        </span>
        <button
          onClick={onSubmit}
          disabled={hasError || isPending}
          className="flex items-center gap-2 bg-blue-400 text-white rounded-md px-4 py-2 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isPending ? "Enregistrement…" : "Enregistrer tout"}
        </button>
      </div>
    </div>
  );
}
