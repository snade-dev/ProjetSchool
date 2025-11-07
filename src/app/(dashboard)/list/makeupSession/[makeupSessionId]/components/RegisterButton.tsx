"use client";

import { useState } from "react";
import MakeupExamForm from "./makeupExam";
import { Subject } from "@/app/generated/prisma";

interface RegisterButtonProps {
  makeupSessionId: string;
  registeredSubjects: number[];
  userId: string;
  subjects: Subject[];
  semesterId: number;
}

export function RegisterButton({
  makeupSessionId,
  registeredSubjects,
  userId,
  semesterId,
  subjects,
}: RegisterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Si l'étudiant s'est inscrit à toutes les matières disponibles
  if (subjects.length === 0) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
      >
        Inscrit à toutes les matières
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Inscription en cours..." : "S'inscrire à une matière"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg p-6 w-full max-w-2xl">
              <MakeupExamForm
                semesterId={semesterId}
                subjects={subjects}
                userId={userId}
                sessionId={makeupSessionId}
                data={{} as any}
              />
              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
