"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useFormState } from "react-dom";
import {
  createResult,
  updateResult,
  deleteResult,
} from "@/lib/actions/resultAction";
import { ResultSchema } from "@/lib/formsValidationSchema";

interface ResultFormProps {
  type: "create" | "update" | "delete";
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
  const [selectedClass, setSelectedClass] = useState(
    data?.student?.classId?.toString() || ""
  );
  const [selectedSemester, setSelectedSemester] = useState(
    data?.semesterId?.toString() || ""
  );
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [studentUsername, setStudentUsername] = useState(
    data?.student?.username || ""
  );
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
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
      message: "",
    }
  );

  // Charger les matières quand le semestre est sélectionné
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

  // Pré-remplir les données pour la modification
  useEffect(() => {
    if (type === "update" && data?.results) {
      const initialScores = data.results.reduce((acc: any, result: any) => {
        acc[result.subjectId] = result.score.toString();
        return acc;
      }, {});
      setScores(initialScores);
      setSelectedClass(data.student.classId.toString());
      setSelectedSemester(data.semesterId.toString());
      setStudentUsername(data.student.username);
    }
  }, [type, data]);

  const handleScoreChange = (subjectId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", data.id);
      const result = await deleteResult(
        {
          success: false,
          error: false,
          message: " ",
        },
        formData
      );

      if (result.success) {
        toast.success("Note supprimée avec succès");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation des notes
      const invalidScores = Object.entries(scores).filter(([_, score]) => {
        const num = parseFloat(score);
        return isNaN(num) || num < 0 || num > 20;
      });

      if (invalidScores.length > 0) {
        toast.error("Les notes doivent être comprises entre 0 et 20");
        setLoading(false);
        return;
      }

      const promises = Object.entries(scores).map(([subjectId, score]) => {
        const formData = {
          id: data?.results?.find(
            (r: any) => r.subjectId === parseInt(subjectId)
          )?.id,
          studentUsername: studentUsername,
          subjectId: parseInt(subjectId),
          score: parseFloat(score),
          semesterId: parseInt(selectedSemester),
          examId: relatedData.exams[0].id,
        };

        return formAction(formData);
      });

      const results = await Promise.all(promises);
      const hasError = results.some((result) => result.error);

      if (!hasError) {
        toast.success("Notes modifiées avec succès");
        setOpen(false);
        router.refresh();
      } else {
        results.forEach((result) => {
          if (result.error) {
            toast.error(result.message);
          }
        });
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Saisir les notes"
          : type === "update"
          ? "Modifier les notes"
          : "Supprimer les notes"}
      </h1>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/3">
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

          <div className="flex flex-col gap-2 w-full md:w-1/3">
            <label className="text-xs text-gray-500">Semestre</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              disabled={!selectedClass}
              required
            >
              <option value="">Sélectionner un semestre</option>
              {semesters.length > 0 ? (
                semesters.map((semester: any) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
                ))
              ) : (
                <option disabled>Aucun semestre disponible</option>
              )}
            </select>
            {!semesters.length && (
              <p className="text-red-500 text-xs mt-1">
                Aucun semestre n&apos;est configuré. Veuillez en créer un
                d&apos;abord.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full md:w-1/3">
            <label className="text-xs text-gray-500">
              Nom de l&apos;étudiant
            </label>
            <input
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
              value={studentUsername}
              onChange={(e) => setStudentUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              required
              readOnly={type === "update"}
            />
          </div>
        </div>

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

      {state.error && (
        <div className="text-red-500 text-sm mt-2">
          {state.message || "Une erreur s'est produite"}
        </div>
      )}

      <div className="flex gap-4 justify-end">
        {type === "update" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 text-white p-2 rounded-md disabled:bg-slate-500"
          >
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        )}

        <button
          type="submit"
          disabled={
            loading || !selectedClass || !selectedSemester || !studentUsername
          }
          className="bg-blue-400 text-white p-2 rounded-md disabled:bg-slate-500"
        >
          {loading
            ? "Enregistrement..."
            : type === "create"
            ? "Enregistrer les notes"
            : "Modifier les notes"}
        </button>
      </div>
    </form>
  );
};

export default ResultForm;
