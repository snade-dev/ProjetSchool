import Performance from "@/components/Performance";
import Image from "next/image";
import Link from "next/link";
import Announcement from "@/components/Annoucement";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Class, Student } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import FormContainer from "@/components/FormContainer";
import { Suspense } from "react";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import { headers } from "next/headers";
import BulletinButton from "@/components/BulletinButton";
import SemesterSelector from "@/components/SemesterSelector";
import { buildReportCard } from "@/lib/reportCard";

const SingleStudentPage = async (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { id } = params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role;
  const userId = session?.user.id;

  // Contrôle d'accès S13 : student → seulement lui-même ; parent → seulement
  // ses enfants (vérifié après chargement) ; admin/teacher OK ; sinon notFound().
  if (!role || !userId) {
    return notFound();
  }
  if (!["admin", "teacher", "student", "parent"].includes(role)) {
    return notFound();
  }
  if (role === "student" && userId !== id) {
    return notFound();
  }

  const student:
    | (Student & {
        class: Class & { _count: { lessons: number } };
      })
    | null = await prisma.student.findUnique({
    where: { id: id },
    include: {
      class: { include: { _count: { select: { lessons: true } } } },
    },
  });

  if (!student) {
    return notFound();
  }

  if (role === "parent" && student.parentId !== userId) {
    return notFound();
  }

  // S13 — Bulletin : semestre sélectionné (?semesterId=) + ReportCardData précalculé
  // côté serveur (le bouton PDF ne fait AUCUN accès DB).
  const semesters = await prisma.semester.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  const requestedSemesterId = searchParams.semesterId
    ? parseInt(searchParams.semesterId)
    : undefined;
  const selectedSemester =
    semesters.find((s) => s.id === requestedSemesterId) ?? semesters[0];
  const reportCard = selectedSemester
    ? await buildReportCard(student.id, selectedSemester.id)
    : null;

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 md:flex-row">
      {/* LEFT */}
      <div className="w-full md:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-lamaSky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 roundxed-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className=" flex items-center gap-2">
                <h1 className="text-lg font-semibold">
                  {student.name + " " + student.surname}
                </h1>
                {/* La FormModal */}
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit.
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{student.bloodType}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat("fr-FR").format(student.birthday)}
                  </span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{student.email}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{student.phone}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[100%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <Suspense fallback="...Loading">
                <StudentAttendanceCard id={student.id} />
              </Suspense>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[100%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class.name}</h1>
                <span className="text-sm text-gray-400">Classe</span>
              </div>
            </div>
            {/* CARD */}
            {/* <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class._count.lessons}</h1>
                <span className="text-sm text-gray-400">Lessons</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class.name}</h1>
                <span className="text-sm text-gray-400">Class</span>
              </div>
            </div> */}
          </div>
        </div>
        {/* BOTTOM — Emploi du temps de la classe */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1 className="text-lg font-semibold mb-2">Emploi du temps</h1>
          <div className="h-[730px]">
            <BigCalandarContainer type="classId" id={student.classId} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        {/* S13 — Bulletin scolaire (sélecteur de semestre + PDF précalculé) */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Bulletin scolaire</h1>
          {semesters.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Aucun semestre configuré.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <SemesterSelector
                semesters={semesters}
                selectedId={selectedSemester?.id}
              />
              {reportCard ? (
                <BulletinButton data={reportCard} />
              ) : (
                <p className="text-sm text-gray-400">
                  Bulletin indisponible pour ce semestre.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Racourcie</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-lamaSkyLight"
              href={`/list/lessons?classId=${2}`}
            >
              Lessons de l&apos;etudiant
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaPurpleLight"
              href={`/list/teachers?classId=${2}`}
            >
              Ensaignant de l&apos;étudiant
            </Link>
            <Link
              className="p-3 rounded-md bg-pink-50"
              href={`/list/exams?classId=${2}`}
            >
              Examès de l&apos;étudiant;
            </Link>
            <Link
              className="p-3 rounded-md bg-lamaYellowLight"
              href={`/list/results?studentId=${id}`}
            >
              Resultat de l&apos;étudiant;
            </Link>
          </div>
        </div>
        <Performance />
        <Announcement />
      </div>
    </div>
  );
};

export default SingleStudentPage;
