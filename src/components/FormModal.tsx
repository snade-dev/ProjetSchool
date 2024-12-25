"use client";

import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";
import dynamic from "next/dynamic";
import { useFormState } from "react-dom";
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
import { deleteParent } from "@/lib/parentAction";
import { deleteLesson } from "@/lib/lessonAction";
import { deleteAnnounce } from "@/lib/actions/announceAction";

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
  event: (type, data, setOpen, relatedData) => (
    <EventsForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const Form = () => {
    const deleteActionMap = {
      subject: deleteSubject,
      class: deleteClass,
      teacher: deleteTeacher,
      student: deleteStudent,
      exam: deleteExam,
      // TODO: OTHER DELETE ACTIONS
      parent: deleteParent,
      lesson: deleteLesson,
      assignment: deleteSubject,
      result: deleteSubject,
      attendance: deleteSubject,
      event: deleteSubject,
      announcement: deleteAnnounce,
    };
    // si c'est un formulaire de suppression
    const [state, formAction] = useFormState(deleteActionMap[table], {
      success: false,
      error: false,
    });

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
            Une erreur c&apos;est proudite lors de la suppression
          </p>
        )}
      </form>
    ) : type === "create" || type === "update" ? (
      // si c'est un formulaire de creation ou de modification
      forms[table](type, data, setOpen, relatedData)
    ) : (
      "Form not found"
    );
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor} ${
          type === "update" && " bg-slate-950  font-bold"
        }`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-full min-h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
