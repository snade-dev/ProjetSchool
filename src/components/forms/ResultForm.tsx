"use client";

import { Dispatch, SetStateAction, useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createResult } from "@/lib/actions/resultAction";
import { ResultSchema } from "@/lib/formsValidationSchema";

interface ResultFormProps {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData: {
    exams: any[]; // Inutile, mais peut être conservé pour d'autres usages
    subjects: any[];
    semesters: any[];
    classes: any[];
  };
}

interface ActionResult {
  success: boolean;
  error: boolean;
  message: string;
}

const ResultForm = ({ type, data, setOpen, relatedData }: ResultFormProps) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  // Suppression de selectedExam puisque le filtre examen n'est plus nécessaire
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [studentUsername, setStudentUsername] = useState("");
  // Modification de "scores" pour gérer deux valeurs par matière : score d'examen et note de classe
  const [scores, setScores] = useState<{
    [key: string]: { score: string; classScore: string };
  }>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const { exams = [], subjects = [], semesters = [], classes = [] } = relatedData || {};

  const [state, formAction] = useActionState<ActionResult, ResultSchema>(
    createResult,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  useEffect(() => {
    if (selectedSemester) {
      const filteredSubjects = subjects.filter((subject: any) =>
        subject.semesters.some((sem: any) => sem.id === parseInt(selectedSemester))
      );
      setSemesterSubjects(filteredSubjects);
      setScores({});
    }

    if (state.success) {
      toast.success("Toutes les notes ont été enregistrées avec succès");
      setOpen(false);
      router.refresh();
    }

    if (state.error) {
      console.log("Erreur lors de la soumission:", state.message);
      toast.error(state.message || "Erreur lors de l'enregistrement");
    }

  }, [router, selectedSemester, setOpen, state.error, state.message, state.success, subjects]);

  // Mise à jour de la fonction pour gérer les deux champs
  const handleScoreChange = (
    subjectId: string,
    field: "score" | "classScore",
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [subjectId]: {
        score: field === "score" ? value : prev[subjectId]?.score || "",
        classScore: field === "classScore" ? value : prev[subjectId]?.classScore || "",
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentUsername || !selectedClass || !selectedSemester) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setLoading(true);

    try {
      let hasError = false;
      const promises: Promise<ActionResult>[] = [];

      // Pour chaque matière pour laquelle on a saisi des notes
      for (const [subjectId, scoreObj] of Object.entries(scores)) {
        if (scoreObj.score || scoreObj.classScore) {
          // On construit les données du formulaire en incluant la note d'examen et la note de classe
          const formData: ResultSchema = {
            studentUsername,
            subjectId: parseInt(subjectId),
            score: scoreObj.score ? parseFloat(scoreObj.score) : 0,
            classScore: scoreObj.classScore ? parseFloat(scoreObj.classScore) : 0,
            semesterId: parseInt(selectedSemester),
            // L'examen n'est plus concerné, donc examId n'est pas envoyé
          };

          promises.push(
            (async () => {
              const result = await formAction(formData);
              const actionResult = result as unknown as ActionResult;
              if (actionResult?.error) {
                hasError = true;
                toast.error(
                  actionResult.message || "Erreur lors de l'enregistrement"
                );
              }
              return actionResult;
            })()
          );
        }
      }

      await Promise.all(promises);

   
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      toast.error(
        "Une erreur s'est produite lors de l'enregistrement des notes"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Saisir les notes" : "Modifier les notes"}
      </h1>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          {/* Sélection de la classe */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Classe</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              required
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((classe: any) => (
                <option key={classe.id} value={classe.id}>
                  {classe.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sélection du semestre */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Semestre</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              disabled={!selectedClass}
              required
            >
              <option value="">Sélectionner un semestre</option>
              {semesters.map((semester: any) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </div>

          {/* Suppression du filtre examen */}

          {/* Nom de l'étudiant */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">
              Nom de l&apos;étudiant
            </label>
            <input
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={studentUsername}
              onChange={(e) => setStudentUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              required
            />
          </div>
        </div>

        {/* Saisie des notes par matière */}
        {selectedSemester && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-4">Notes par matière</h2>
            <div className="flex flex-col gap-3">
              {semesterSubjects.map((subject: any) => (
                <div key={subject.id} className="flex items-center gap-4">
                  <span className="w-1/3">{subject.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    className="w-20 ring-[1.5px] ring-gray-300 rounded-md text-sm p-2"
                    placeholder="Note d'examen"
                    value={scores[subject.id]?.score || ""}
                    onChange={(e) =>
                      handleScoreChange(subject.id, "score", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    className="w-20 ring-[1.5px] ring-gray-300 rounded-md text-sm p-2"
                    placeholder="Note de classe"
                    value={scores[subject.id]?.classScore || ""}
                    onChange={(e) =>
                      handleScoreChange(subject.id, "classScore", e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        disabled={loading}
        className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-500"
        type="submit"
      >
        {loading ? "Enregistrement..." : "Enregistrer les notes"}
      </button>
    </form>
  );
};

export default ResultForm;
