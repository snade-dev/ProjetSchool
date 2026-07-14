import Performance from "@/components/Performance";
import Image from "next/image";
import Link from "next/link";
import Announcement from "@/components/Annoucement";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { EnrollmentStatus } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import FormContainer from "@/components/FormContainer";
import { Suspense } from "react";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import { headers } from "next/headers";
import BulletinButton from "@/components/BulletinButton";
import GuardianSection from "@/components/GuardianSection";
import SemesterSelector from "@/components/SemesterSelector";
import { buildReportCard } from "@/lib/reportCard";
import { semesterSystemWhere } from "@/lib/evaluation";

// W03 — libellés français des statuts d'inscription (§2.1.3)
const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Inscrit",
  TRANSFERRED: "Transféré",
  LEFT: "Parti",
  GRADUATED: "Admis",
  REPEATED: "Redoublé",
};

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
  // W07 — direction et surveillant général consultent la fiche élève.
  if (!["admin", "director", "teacher", "supervisor", "student", "parent"].includes(role)) {
    return notFound();
  }
  if (role === "student" && userId !== id) {
    return notFound();
  }

  // W03 — la classe actuelle vient de l'inscription de l'année ACTIVE ; le
  // parcours complet (§2.1.3) vient de TOUTES les inscriptions de l'élève.
  // W05 — les tuteurs (StudentGuardian) portent l'accès parent et les droits.
  const student = await prisma.student.findUnique({
    where: { id: id },
    include: {
      enrollments: {
        include: {
          class: {
            include: {
              level: true,
              _count: { select: { lessons: true } },
            },
          },
          schoolYear: { select: { id: true, name: true, isActive: true } },
        },
        orderBy: { schoolYear: { startDate: "desc" } },
      },
      guardians: {
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              surname: true,
              username: true,
              phone: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!student) {
    return notFound();
  }

  // W05 — un parent n'accède qu'aux élèves dont il est tuteur
  const parentGuardian =
    role === "parent"
      ? student.guardians.find((g) => g.parent.id === userId) ?? null
      : null;
  if (role === "parent" && !parentGuardian) {
    return notFound();
  }
  // W05 — droit différencié : canViewGrades=false masque le bulletin
  const canViewGrades = role !== "parent" || parentGuardian!.canViewGrades;

  const currentEnrollment =
    student.enrollments.find((e) => e.schoolYear.isActive) ?? null;
  const currentClass = currentEnrollment?.class ?? null;

  // S13 — Bulletin : période sélectionnée (?semesterId=) + ReportCardData précalculé
  // côté serveur (le bouton PDF ne fait AUCUN accès DB).
  // V01 — seules les périodes du régime de la classe de l'élève sont proposées.
  // W09 — classe COMBINED : périodes des DEUX régimes (bulletins de composition
  // ET de trimestre, §2.3.1 système 3).
  const semesters = currentClass
    ? await prisma.semester.findMany({
        where: {
          ...semesterSystemWhere(currentClass.evaluationSystem),
          schoolYearId: currentEnrollment!.schoolYear.id,
        },
        select: { id: true, name: true },
        orderBy: [{ system: "asc" }, { order: "asc" }],
      })
    : [];
  const requestedSemesterId = searchParams.semesterId
    ? parseInt(searchParams.semesterId)
    : undefined;
  const selectedSemester =
    semesters.find((s) => s.id === requestedSemesterId) ?? semesters[0];
  // W05 — pas de calcul de bulletin pour un tuteur sans droit de voir les notes
  const reportCard =
    canViewGrades && selectedSemester
      ? await buildReportCard(student.id, selectedSemester.id)
      : null;

  // W08 — bulletin périmé (§2.1.6) : un coefficient de la classe a changé
  // après le dernier calcul officiel → badge « À régénérer » jusqu'à la
  // régénération explicite (écran Matières & coefficients de la classe).
  const staleAverage =
    reportCard && selectedSemester
      ? await prisma.resultAverage.findUnique({
          where: {
            semesterId_studentId: {
              semesterId: selectedSemester.id,
              studentId: student.id,
            },
          },
          select: { stale: true },
        })
      : null;
  const isStale = staleAverage?.stale ?? false;

  // W05 — parents de l'école proposés à l'ajout de tuteur (admin/direction)
  const schoolParents =
    role === "admin" || role === "director"
      ? await prisma.parent.findMany({
          where: { schoolId: student.schoolId },
          select: { id: true, name: true, surname: true, username: true },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        })
      : [];

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
                {/* La FormModal — W03 : classId dérivé de l'inscription active */}
                {role === "admin" && (
                  <FormContainer
                    table="student"
                    type="update"
                    data={{ ...student, classId: currentClass?.id }}
                  />
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
                <h1 className="text-xl font-semibold">
                  {currentClass?.name ?? "Non inscrit"}
                </h1>
                <span className="text-sm text-gray-400">Classe</span>
              </div>
            </div>
            {/* CARD */}
          </div>
        </div>
        {/* W03 — Parcours : historique des inscriptions (§2.1.3) */}
        <div className="mt-4 bg-white rounded-md p-4">
          <h1 className="text-lg font-semibold mb-2">Parcours</h1>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune inscription enregistrée.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="p-2">Année scolaire</th>
                  <th className="p-2">Classe</th>
                  <th className="p-2 hidden md:table-cell">Niveau</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2 hidden md:table-cell">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-gray-100 even:bg-slate-50 ${
                      e.schoolYear.isActive ? "bg-lamaSkyLight" : ""
                    }`}
                  >
                    <td className="p-2 font-medium">
                      {e.schoolYear.name}
                      {e.schoolYear.isActive && (
                        <span className="ml-2 text-xs text-gray-500">
                          (en cours)
                        </span>
                      )}
                    </td>
                    <td className="p-2">{e.class.name}</td>
                    <td className="p-2 hidden md:table-cell">
                      {e.class.level?.name ?? "-"}
                    </td>
                    <td className="p-2">
                      {ENROLLMENT_STATUS_LABELS[e.status] ?? e.status}
                    </td>
                    <td className="p-2 hidden md:table-cell">
                      {new Intl.DateTimeFormat("fr-FR").format(e.enrolledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* W05 — Tuteurs de l'élève (§2.2.3) : liste + droits ; CRUD admin */}
        {(role === "admin" || role === "director" || role === "teacher") && (
          <GuardianSection
            studentId={student.id}
            guardians={student.guardians}
            parents={schoolParents}
            canManage={role === "admin" || role === "director"}
          />
        )}
        {/* BOTTOM — Emploi du temps de la classe */}
        {currentClass && (
          <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
            <h1 className="text-lg font-semibold mb-2">Emploi du temps</h1>
            <div className="h-[730px]">
              <BigCalandarContainer type="classId" id={currentClass.id} />
            </div>
          </div>
        )}
      </div>
      {/* RIGHT */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        {/* S13 — Bulletin scolaire (sélecteur de semestre + PDF précalculé) */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Bulletin scolaire</h1>
          {!canViewGrades ? (
            // W05 — tuteur sans droit de consultation des notes
            <p className="mt-4 text-sm text-gray-400">
              La consultation des notes et bulletins n&apos;est pas activée
              pour votre compte. Contactez l&apos;administration.
            </p>
          ) : semesters.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Aucun semestre configuré.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <SemesterSelector
                semesters={semesters}
                selectedId={selectedSemester?.id}
              />
              {isStale && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                  À régénérer — un coefficient de la classe a changé
                </span>
              )}
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
            {canViewGrades && (
              <Link
                className="p-3 rounded-md bg-lamaYellowLight"
                href={`/list/results?studentId=${id}`}
              >
                Resultat de l&apos;étudiant;
              </Link>
            )}
          </div>
        </div>
        <Performance />
        <Announcement />
      </div>
    </div>
  );
};

export default SingleStudentPage;
