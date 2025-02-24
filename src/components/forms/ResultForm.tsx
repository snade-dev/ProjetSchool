"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useFormState } from "react-dom";
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
  const [selectedExam, setSelectedExam] = useState(""); // ✅ Ajout du champ d'examen
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [studentUsername, setStudentUsername] = useState("");
  const [scores, setScores] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const {
    exams = [],
    subjects = [],
    semesters = [],
    classes = [],
  } = relatedData || {};

  const [state, formAction] = useFormState<ActionResult, ResultSchema>(
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
        subject.semesters.some(
          (sem: any) => sem.id === parseInt(selectedSemester)
        )
      );
      setSemesterSubjects(filteredSubjects);
      setScores({});
    }
  }, [selectedSemester, subjects]);

  const handleScoreChange = (subjectId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentUsername || !selectedClass || !selectedSemester || !selectedExam) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setLoading(true);

    try {
      let hasError = false;
      const promises: Promise<ActionResult>[] = [];

      for (const [subjectId, score] of Object.entries(scores)) {
        if (score) {
          const formData: ResultSchema = {
            studentUsername,
            subjectId: parseInt(subjectId),
            score: parseFloat(score),
            semesterId: parseInt(selectedSemester),
            examId: parseInt(selectedExam), // ✅ Utilisation de l'examen sélectionné
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

      if (!hasError) {
        toast.success("Toutes les notes ont été enregistrées avec succès");
        setOpen(false);
        router.refresh();
      }
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

          {/* Sélection de l'examen ✅ */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Examen</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={!selectedSemester}
              required
            >
              <option value="">Sélectionner un examen</option>
              {exams.map((exam: any) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>

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

        {/* Notes par matière */}
        {selectedSemester && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-4">Notes par matière</h2>
            <div className="grid grid-cols-2 gap-4">
              {semesterSubjects.map((subject) => (
                <div key={subject.id} className="flex items-center gap-4">
                  <span className="w-1/2">{subject.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    className="w-20 ring-[1.5px] ring-gray-300 rounded-md text-sm p-2"
                    placeholder="Note"
                    value={scores[subject.id] || ""}
                    onChange={(e) =>
                      handleScoreChange(subject.id, e.target.value)
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
