"use client";

import { useState, useEffect } from "react";
import { Subject, Result, Class, Semester } from "@prisma/client";
import BulletinButton from "@/components/BulletinButton";

interface StudentResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  classes: Class[];
  semesters: Semester[];
  initialClassId?: string;
  initialSemesterId?: string;
}

interface ResultWithSubject {
  subjectId: number;
  subjectName: string;
  score: number | null;
}

export default function StudentResultModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  classes,
  semesters,
  initialClassId,
  initialSemesterId,
}: StudentResultModalProps) {
  const [selectedClass, setSelectedClass] = useState(initialClassId || "");
  const [selectedSemester, setSelectedSemester] = useState(initialSemesterId || "");
  const [results, setResults] = useState<ResultWithSubject[]>([]);
  const [currentClassName, setCurrentClassName] = useState<string>("");
  const [selectedSemesterName, setSelectedSemesterName] = useState("");
  const [allSubjects, setAllSubjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetch(`/api/results?studentId=${studentId}&classId=${selectedClass}&semesterId=${selectedSemester}`)
        .then(res => res.json())
        .then(data => {
          setResults(data.results || []);
          setCurrentClassName(data.className || "");
          setAllSubjects(data.subjects || []);
          const semester = semesters.find(s => s.id === parseInt(selectedSemester));
          setSelectedSemesterName(semester?.name || "");
        })
        .catch(error => {
          console.error("Fetch error:", error);
        });
    }
  }, [studentId, selectedClass, selectedSemester, semesters]);

  // Préparer les données pour le bulletin avec toutes les matières
  const bulletinGrades = allSubjects.map(subject => ({
    subject: subject.name,
    score: results.find(r => r.subjectId === subject.id)?.score ?? 0, // 0 pour les notes manquantes
    hasScore: results.some(r => r.subjectId === subject.id)
  }));

  // Préparer les données pour l'affichage dans le tableau
  const displayResults = allSubjects.map(subject => {
    const result = results.find(r => r.subjectId === subject.id);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      score: result?.score ?? null
    };
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Résultats de {studentName}
            </h2>
            {currentClassName && (
              <span className="text-sm text-gray-600">
                Classe: {currentClassName}
              </span>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <select
              className="p-2 border rounded"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.name}
                </option>
              ))}
            </select>

            <select
              className="p-2 border rounded"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option value="">Sélectionner un semestre</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>

            <BulletinButton
              studentName={studentName}
              grades={bulletinGrades}
              className={currentClassName}
              semesterName={selectedSemesterName}
            />
          </div>

          {selectedClass && selectedSemester && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Matière</th>
                    <th className="p-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((result) => (
                    <tr key={result.subjectId} className="border-b">
                      <td className="p-2">{result.subjectName}</td>
                      <td className="p-2">{result.score ?? "Non noté"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 