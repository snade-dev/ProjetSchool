"use client";

import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState, useActionState, type JSX } from "react";

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";
import dynamic from "next/dynamic";
import {
  deleteClass,
  deleteExam,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
} from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import { deleteLesson } from "@/lib/actions/lessonAction";
import { deleteAnnounce } from "@/lib/actions/announceAction";
import { deleteEvent } from "@/lib/actions/eventAction";
import { deleteAverage } from "@/lib/actions/averageAction";
import { deleteResult } from "@/lib/actions/resultAction";
import { deleteAttendance } from "../lib/actions/attendanceAction";
import { deleteQuiz } from "@/lib/actions/quizAction";
import { deleteParent } from "@/lib/actions/parentAction";
import AttestationForm from "./forms/AttestationForm";
import { Edit, Plus, Trash } from "lucide-react";
import { deleteSemester } from "@/lib/actions/semesterActions";
import MakeupSessionForm from "./forms/MakeupSessionForm";
import { deleteMakeupSession } from "@/lib/actions/makeupSessionAction";
import { deleteSchoolYear } from "@/lib/actions/settingsAction";
import { deleteFee } from "@/lib/actions/feeAction";
import { deleteInvoice } from "@/lib/actions/invoiceAction";
import { deleteExpense } from "@/lib/actions/expenseAction";
import { deleteEmployee } from "@/lib/actions/employeeAction";
import { deleteLevel } from "@/lib/actions/levelAction";
import { deleteHomework } from "@/lib/actions/homeworkAction";
import { deleteObservation } from "@/lib/actions/observationAction";
// import { deleteSemester } from "@/lib/actions/parentAction";

const TeacherForms = dynamic(() => import("./forms/TeacherForms"), {
  loading: () => <h1>Loading...</h1>,
});

const ParentForms = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForms = dynamic(() => import("./forms/StudentForms"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForms = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SemesterForm = dynamic(() => import("./forms/SemestForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventsForm = dynamic(() => import("./forms/EventsForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AverageForm = dynamic(() => import("./forms/AverageForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
const QuizForm = dynamic(() => import("./forms/QuizForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SchoolYearForm = dynamic(() => import("./forms/SchoolYearForm"), {
  loading: () => <h1>Loading...</h1>,
});
const FeeForm = dynamic(() => import("./forms/FeeForm"), {
  loading: () => <h1>Loading...</h1>,
});
const InvoiceForm = dynamic(() => import("./forms/InvoiceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const PaymentForm = dynamic(() => import("./forms/PaymentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExpenseForm = dynamic(() => import("./forms/ExpenseForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EmployeeForm = dynamic(() => import("./forms/EmployeeForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LevelForm = dynamic(() => import("./forms/LevelForm"), {
  loading: () => <h1>Loading...</h1>,
});
const HomeworkForm = dynamic(() => import("./forms/HomeworkForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ObservationForm = dynamic(() => import("./forms/ObservationForm"), {
  loading: () => <h1>Loading...</h1>,
});

const forms: {
  [key: string]: (
    type: "create" | "update",
    setOpen: Dispatch<SetStateAction<boolean>>,
    data?: any,
    relaratedData?: any
  ) => JSX.Element;
} = {
  subject: (type, data, setOpen, relatedData) => (
    <SubjectForms
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (type, data, setOpen, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  semester: (type, data, setOpen, relatedData) => (
    <SemesterForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (type, data, setOpen, relatedData) => (
    <TeacherForms
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  parent: (type, data, setOpen, relatedData) => (
    <ParentForms
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (type, data, setOpen, relatedData) => (
    <StudentForms
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lesson: (type, data, setOpen, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (type, data, setOpen, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (type, data, setOpen, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attendance: (type, data, setOpen, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  quiz: (type, data, setOpen, relatedData) => (
    <QuizForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  attestation: (type, data, setOpen, relatedData) => (
    <AttestationForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (type, data, setOpen, relatedData) => (
    <EventsForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  average: (type, data, setOpen, relatedData) => (
    <AverageForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  result: (type, data, setOpen, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  makeupSession: (type, data, setOpen, relatedData) => (
    <MakeupSessionForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  schoolYear: (type, data, setOpen, relatedData) => (
    <SchoolYearForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  fee: (type, data, setOpen, relatedData) => (
    <FeeForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  invoice: (type, data, setOpen, relatedData) => (
    <InvoiceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  payment: (type, data, setOpen, relatedData) => (
    <PaymentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  expense: (type, data, setOpen, relatedData) => (
    <ExpenseForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  employee: (type, data, setOpen, relatedData) => (
    <EmployeeForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  level: (type, data, setOpen, relatedData) => (
    <LevelForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  homework: (type, data, setOpen, relatedData) => (
    <HomeworkForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  observation: (type, data, setOpen, relatedData) => (
    <ObservationForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
};

// Form est défini au niveau module (et non dans le corps de FormModal) :
// un composant recréé à chaque render est démonté/remonté par React,
// ce qui détruit l'état de useActionState pendant la soumission
// (le modal ne se fermait jamais après un update réussi).
const Form = ({
  table,
  type,
  data,
  id,
  relatedData,
  setOpen,
}: FormContainerProps & {
  relatedData?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const deleteActionMap = {
      subject: deleteSubject,
      class: deleteClass,
      teacher: deleteTeacher,
      student: deleteStudent,
      exam: deleteExam,
      parent: deleteParent,
      lesson: deleteLesson,
      average: deleteAverage,
      result: deleteResult,
      // S20 : `event` pointait sur deleteSubject (supprimer un événement
      // supprimait la MATIÈRE de même id). `assignment` et `attestation`
      // (mappés eux aussi sur de mauvaises actions) n'ont aucune UI de
      // suppression : retirés du map.
      event: deleteEvent,
      announcement: deleteAnnounce,
      attendance: deleteAttendance,
      quiz: deleteQuiz,
      semester:deleteSemester,
      makeupSession:deleteMakeupSession,
      schoolYear:deleteSchoolYear,
      fee:deleteFee,
      invoice:deleteInvoice,
      expense:deleteExpense,
      employee:deleteEmployee,
      level:deleteLevel,
      homework:deleteHomework,
      observation:deleteObservation
    };
    // si c'est un formulaire de suppression
    // (payment n'utilise pas ce chemin : encaissement = création uniquement)
    const [state, formAction] = useActionState(
      deleteActionMap[table as keyof typeof deleteActionMap],
      {
        success: false,
        error: false,
      }
    );

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`Sujet à ete supprimer`);
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    return type === "delete" && id ? (
      <form action={formAction} className="p-4 flex flex-col gap-4">
        <input type="text | number" name="id" value={id} hidden />
        <span className="text-center font-medium">
          Toutes les données seront perdu.Ête vous sure de vouloir supprimer
          l&apos;
          {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center">
          Delete
        </button>
        {state.error && (
          <p className=" font-bold text-red-300">
            {(state as any).message ||
              "Une erreur c'est proudite lors de la suppression"}
          </p>
        )}
      </form>
    ) : type === "create" || type === "update" ? (
      // si c'est un formulaire de creation ou de modification
      (forms[table](type, data, setOpen, relatedData))
    ) : (
      "Form not found"
    );
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  // Échap ferme le panneau ; le scroll de la page est gelé tant qu'il est ouvert
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor} ${
          type === "update" && "text-white  font-bold"
        }`}
        onClick={() => setOpen(true)}
      >
        {type === "create" && <Plus size={16} />}
        {type === "update" && <Edit size={16} />}
        {type === "delete" && <Trash size={16} className="font-bold" />}
      </button>
      {open && type === "delete" && (
        // confirmation courte : petite carte centrée
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[92%] max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-gray-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <Form
              table={table}
              type={type}
              data={data}
              id={id}
              relatedData={relatedData}
              setOpen={setOpen}
            />
            <button
              type="button"
              aria-label="Fermer"
              className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </button>
          </div>
        </div>
      )}
      {open && type !== "delete" && (
        // S21 « Registre » : panneau latéral plein-hauteur, liste visible derrière
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-drawer-in absolute right-0 top-0 h-full w-full max-w-[540px] overflow-y-auto bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Form
              table={table}
              type={type}
              data={data}
              id={id}
              relatedData={relatedData}
              setOpen={setOpen}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
