import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { notFound } from "next/navigation";
import Filters from "./components/Filters";
import GradeGrid from "./components/GradeGrid";

type Option = { id: number; name: string };

/**
 * E17 — Saisie de notes en masse (`/list/gradeEntry`), admin + teacher.
 * Selects classe/matière/semestre via searchParams. Teacher : options limitées à
 * ses Lessons (distinct classId/subjectId) + garde serveur si params hors périmètre.
 */
export default async function GradeEntryPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;

  const info = await getSessionInfo();
  if (!info || !["admin", "teacher"].includes(info.role)) return notFound();
  const { userId, role } = info;

  // Options des selects + périmètre autorisé (teacher).
  let classOptions: Option[] = [];
  let subjectOptions: Option[] = [];
  let allowedPairs: Set<string> | null = null;

  if (role === "teacher") {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: userId },
      select: {
        classId: true,
        subjectId: true,
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    const classMap = new Map<number, string>();
    const subjectMap = new Map<number, string>();
    allowedPairs = new Set<string>();
    for (const l of lessons) {
      classMap.set(l.class.id, l.class.name);
      subjectMap.set(l.subject.id, l.subject.name);
      allowedPairs.add(`${l.classId}-${l.subjectId}`);
    }
    classOptions = [...classMap]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    subjectOptions = [...subjectMap]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.subject.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    classOptions = classes;
    subjectOptions = subjects;
  }

  const classId = searchParams.classId ? parseInt(searchParams.classId) : undefined;

  // V01 — les périodes proposées suivent le régime de la classe choisie
  // (toutes tant qu'aucune classe n'est sélectionnée).
  const selectedClass = classId
    ? await prisma.class.findUnique({
        where: { id: classId },
        select: { evaluationSystem: true },
      })
    : null;
  const semesters = await prisma.semester.findMany({
    where: selectedClass ? { system: selectedClass.evaluationSystem } : {},
    select: { id: true, name: true },
    orderBy: [{ system: "asc" }, { order: "asc" }],
  });

  const subjectId = searchParams.subjectId
    ? parseInt(searchParams.subjectId)
    : undefined;
  const requestedSemesterId = searchParams.semesterId
    ? parseInt(searchParams.semesterId)
    : undefined;
  // V01 — période d'un autre régime restée dans l'URL après changement de classe
  const semesterId =
    requestedSemesterId != null &&
    semesters.some((s) => s.id === requestedSemesterId)
      ? requestedSemesterId
      : undefined;

  const allChosen = !!classId && !!subjectId && !!semesterId;

  // Garde serveur : un teacher ne peut cibler qu'une (classe, matière) qu'il enseigne.
  const outOfScope =
    role === "teacher" &&
    !!classId &&
    !!subjectId &&
    !!allowedPairs &&
    !allowedPairs.has(`${classId}-${subjectId}`);

  let students: {
    id: string;
    name: string;
    surname: string;
    img: string | null;
  }[] = [];
  let existing: { studentId: string; score: number; classScore: number | null }[] =
    [];

  if (allChosen && !outOfScope) {
    [students, existing] = await Promise.all([
      prisma.student.findMany({
        where: { classId },
        select: { id: true, name: true, surname: true, img: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
      prisma.result.findMany({
        where: { semesterId, subjectId, student: { classId } },
        select: { studentId: true, score: true, classScore: true },
      }),
    ]);
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="sticky top-0 z-10 bg-white pb-3 border-b">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-lg font-semibold">Saisie des notes</h1>
          <Filters
            classes={classOptions}
            subjects={subjectOptions}
            semesters={semesters}
            initialClassId={searchParams.classId}
            initialSubjectId={searchParams.subjectId}
            initialSemesterId={searchParams.semesterId}
          />
        </div>
      </div>

      {outOfScope ? (
        <p className="mt-6 text-sm text-red-600">
          Vous n'enseignez pas cette matière dans cette classe.
        </p>
      ) : !allChosen ? (
        <p className="mt-6 text-sm text-gray-400">
          Sélectionnez une classe, une matière et un semestre pour saisir les
          notes.
        </p>
      ) : students.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400">
          Aucun élève dans cette classe.
        </p>
      ) : (
        <GradeGrid
          key={`${classId}-${subjectId}-${semesterId}`}
          students={students}
          existing={existing}
          classId={classId as number}
          subjectId={subjectId as number}
          semesterId={semesterId as number}
        />
      )}
    </div>
  );
}
