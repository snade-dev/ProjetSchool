"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createResult } from "@/lib/actions/resultAction";
import { ResultSchema } from "@/lib/formsValidationSchema";

interface ResultFormProps {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData: {
    exams: any[]; 
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
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [studentUsername, setStudentUsername] = useState("");
  const [scores, setScores] = useState<{
    [key: string]: { score: string; classScore: string };
  }>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { exams = [], subjects = [], semesters = [], classes = [] } = relatedData || {};
  const [isPending, startTransition] = useTransition();

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
  }, [
    router, selectedSemester, setOpen, state.error, 
    state.message, state.success, subjects
  ]);

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
      for (const [subjectId, scoreObj] of Object.entries(scores)) {
        if (scoreObj.score || scoreObj.classScore) {
          const formData: ResultSchema = {
            studentUsername,
            subjectId: parseInt(subjectId),
            score: scoreObj.score ? parseFloat(scoreObj.score) : 0,
            classScore: scoreObj.classScore ? parseFloat(scoreObj.classScore) : 0,
            semesterId: parseInt(selectedSemester),
          };
          startTransition(() => {
            formAction(formData);
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      toast.error("Une erreur s'est produite lors de l'enregistrement des notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bg-white p-6 rounded-lg shadow-sm" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {type === "create" ? "Saisir les notes" : "Modifier les notes"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Sélection de la classe */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-1">Classe</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            required
          >
            <option value="">Sélectionner une classe</option>
            {classes.map((classe: any) => (
              <option key={classe.id} value={classe.id}>{classe.name}</option>
            ))}
          </select>
        </div>

        {/* Sélection du semestre */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-1">Semestre</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedClass}
            required
          >
            <option value="">Sélectionner un semestre</option>
            {semesters.map((semester: any) => (
              <option key={semester.id} value={semester.id}>{semester.name}</option>
            ))}
          </select>
        </div>

        {/* Nom de l'étudiant */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-1">
            Nom de l&apos;étudiant
          </label>
          <input
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={studentUsername}
            onChange={(e) => setStudentUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            required
          />
        </div>
      </div>

      {/* Saisie des notes par matière */}
      {selectedSemester && semesterSubjects.length > 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Notes par matière</h2>
          <div className="space-y-4">
            {semesterSubjects.map((subject: any) => (
              <div key={subject.id} className="p-3 bg-white rounded-md shadow-sm border border-gray-200">
                <div className="font-medium text-gray-800 mb-2">{subject.name}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label htmlFor={`exam-${subject.id}`} className="text-sm text-gray-600 mb-1">
                      Note d'examen
                    </label>
                    <input
                      id={`exam-${subject.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="20"
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Sur 20"
                      value={scores[subject.id]?.score || ""}
                      onChange={(e) => handleScoreChange(subject.id, "score", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor={`class-${subject.id}`} className="text-sm text-gray-600 mb-1">
                      Note de classe
                    </label>
                    <input
                      id={`class-${subject.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="20"
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Sur 20"
                      value={scores[subject.id]?.classScore || ""}
                      onChange={(e) => handleScoreChange(subject.id, "classScore", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedSemester && (
        <div className="text-center py-4 text-gray-500">
          Aucune matière trouvée pour ce semestre
        </div>
      )}

      <button
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        type="submit"
      >
        {loading ? "Enregistrement..." : "Enregistrer les notes"}
      </button>
    </form>
  );
};

export default ResultForm;
