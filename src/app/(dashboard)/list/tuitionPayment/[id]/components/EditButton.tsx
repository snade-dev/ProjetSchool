"use client";

import { Edit } from "lucide-react";
import { useState } from "react";
import EditInput from "./EditInput";

export function EditButton({
  TuitionId,
  studentId,
  month,
}: {
  TuitionId: string;
  studentId: string;
  month: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 p-2 shadow-md cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Modifier le paiement"
      >
        <Edit size={16} className="text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Modifier le montant</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <EditInput TuitionId={TuitionId} studentId={studentId} month={month} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
