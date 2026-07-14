import dynamic from "next/dynamic";
import { ResultForm } from "./ResultForm";
import { useState } from "react";
import type { MakeupExamRow } from "./types";

const BulletinButton = dynamic(() => import("@/components/BulletinButton"), {
  ssr: false,
});

// W03 — type partagé (classe résolue via Enrollment côté serveur)
type ResultWithDetails = MakeupExamRow;

interface StudentResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ResultWithDetails[];
  role: string;
}

interface ResultWithSubject {
  subjectId: number;
  subjectName: string;
  score: number | null;
}

export default function StudentResultModal({
  isOpen,
  onClose,
  results,
  role,
}: StudentResultModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  console.log("modal", results);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Résultats de {results[0].student.name}
            </h2>
            {results[0].student.class.name && (
              <span className="text-sm text-gray-600">
                Classe: {results[0].student.class.name}
              </span>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            {/* {typeof window !== "undefined" && (
              <BulletinButton
                studentName={results[0].student.name}
                grades={results.map((r) => ({
                  subject: r.subject.name,
                  score: r.score,
                }))}
                className={results[0].student.class.name}
                semesterName={results[0].semester.name}
              />
            )} */}
            {role === "admin" && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {isEditing ? "Voir les notes" : "Modifier les notes"}
              </button>
            )}
          </div>

          <div className="mt-4">
            {isEditing ? (
              <ResultForm results={results} />
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Matière</th>
                    <th className="p-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-b">
                      <td className="p-2">{result.subject.name}</td>
                      <td className="p-2">{result.score ?? "Non noté"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

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
