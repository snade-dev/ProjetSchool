"use client";

import { useState, useEffect } from "react";
import ActionButtons from "./ActionButtons";
import Modal from "@/components/Modal";
import ResultForm from "@/components/forms/ResultForm";
import { toast } from "react-toastify";

interface ResultActionsProps {
  item: any;
  role: string;
  subjects: any[];
  semesters: any[];
  classes: any[];
}

export default function ResultActions({ 
  item, 
  role, 
  subjects,
  semesters,
  classes 
}: ResultActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditModalOpen) {
      setLoading(true);
      // Charger toutes les notes de l'étudiant pour ce semestre
      fetch(`/api/results?studentId=${item.student.id}&semesterId=${item.semester.id}`)
        .then(res => res.json())
        .then(data => {
          setStudentResults(data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Erreur lors du chargement des notes:", error);
          toast.error("Erreur lors du chargement des notes");
          setLoading(false);
        });
    }
  }, [isEditModalOpen, item.student.id, item.semester.id]);

  if (role !== "admin" && role !== "teacher") return null;

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  return (
    <>
      <ActionButtons
        item={item}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isEditModalOpen && (
        <Modal title={`Modifier les notes de ${item.student.name}`} setOpen={setIsEditModalOpen}>
          {loading ? (
            <div className="flex justify-center items-center p-4">
              Chargement des notes...
            </div>
          ) : (
            <ResultForm
              type="update"
              data={{
                student: {
                  username: item.student.username,
                  classId: item.student.classId,
                  name: item.student.name,
                },
                semesterId: item.semester.id,
                results: studentResults,
              }}
              setOpen={setIsEditModalOpen}
              relatedData={{
                exams: [{ id: item.exam.id, title: item.exam.title }],
                subjects: subjects,
                semesters: semesters,
                classes: classes,
              }}
            />
          )}
        </Modal>
      )}

      {isDeleteModalOpen && (
        <Modal title="Supprimer la note" setOpen={setIsDeleteModalOpen}>
          <ResultForm
            type="delete"
            data={{ id: item.id }}
            setOpen={setIsDeleteModalOpen}
            relatedData={{
              exams: [],
              subjects: [],
              semesters: [],
              classes: [],
            }}
          />
        </Modal>
      )}
    </>
  );
} 