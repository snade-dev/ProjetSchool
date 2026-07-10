import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import Table from "@/components/Table";
import {
  getTeacherStats,
  type TeacherStat,
  type TeacherSortKey,
  type SortDir,
} from "@/lib/stats/teacherStats";
import StatsFilters from "./components/StatsFilters";
import TeacherBarChart from "./components/TeacherBarChart";

type Option = { id: number; name: string };

const pct = (v: number | null) =>
  v == null ? "—" : `${Math.round(v * 100)} %`;

/** Barre de progression /20 : rouge <10, jaune 10–12, vert >12 (brief E38). */
function AverageBar({ average }: { average: number | null }) {
  if (average == null) return <span className="text-gray-400">—</span>;
  const color =
    average < 10
      ? "bg-red-400"
      : average <= 12
      ? "bg-yellow-400"
      : "bg-green-400";
  const width = Math.min(100, Math.max(0, (average / 20) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs font-semibold whitespace-nowrap">
        {average.toFixed(2)}
      </span>
    </div>
  );
}

/** En-tête triable : Link qui bascule asc/desc sur la colonne (?sort=&dir=). */
function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  baseParams,
}: {
  label: string;
  field: TeacherSortKey;
  currentSort: TeacherSortKey;
  currentDir: SortDir;
  baseParams: Record<string, string>;
}) {
  const active = currentSort === field;
  const nextDir: SortDir = active && currentDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams(baseParams);
  params.set("sort", field);
  params.set("dir", nextDir);
  return (
    <Link
      href={`/stats/teachers?${params.toString()}`}
      className={`inline-flex items-center gap-1 hover:text-gray-700 ${
        active ? "text-gray-700 font-semibold" : ""
      }`}
    >
      {label}
      <span className="text-xs">
        {active ? (currentDir === "desc" ? "▼" : "▲") : "↕"}
      </span>
    </Link>
  );
}

/**
 * E38 — Statistiques enseignants (`/stats/teachers`), ADMIN UNIQUEMENT.
 * `/stats` est ouvert à teacher dans routeAccessMap (pour S14) → la garde EN PAGE
 * est OBLIGATOIRE ici (parade story-15). Page descriptive : aucune évaluation
 * qualitative, aucun lien salaire↔performance.
 */
export default async function TeacherStatsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const info = await getSessionInfo();
  if (!info) return notFound();
  const { role } = info;
  if (role !== "admin") redirect("/" + role);

  const searchParams = await props.searchParams;

  const [semesters, subjects] = await Promise.all([
    prisma.semester.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    }) as Promise<Option[]>,
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }) as Promise<Option[]>,
  ]);

  if (semesters.length === 0) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <h1 className="text-lg font-semibold">Statistiques enseignants</h1>
        <p className="mt-6 text-sm text-gray-400">Aucun semestre configuré.</p>
      </div>
    );
  }

  // Défauts : dernier semestre, toutes les matières (mêmes conventions que S14).
  const requestedSemesterId = searchParams.semesterId
    ? parseInt(searchParams.semesterId)
    : undefined;
  const semesterId =
    requestedSemesterId != null &&
    semesters.some((s) => s.id === requestedSemesterId)
      ? requestedSemesterId
      : semesters[semesters.length - 1].id;

  const requestedSubjectId = searchParams.subjectId
    ? parseInt(searchParams.subjectId)
    : undefined;
  const subjectId =
    requestedSubjectId != null &&
    subjects.some((s) => s.id === requestedSubjectId)
      ? requestedSubjectId
      : undefined;

  const sort: TeacherSortKey =
    searchParams.sort === "successRate" ? "successRate" : "average";
  const dir: SortDir = searchParams.dir === "asc" ? "asc" : "desc";

  const stats = await getTeacherStats(semesterId, subjectId, sort, dir);

  const chartData = stats
    .filter((t): t is TeacherStat & { average: number } => t.average != null)
    .map((t) => ({ name: `${t.name} ${t.surname}`, average: t.average }));

  // Params de base des Links de tri : ne conserver que les filtres actifs.
  const baseParams: Record<string, string> = {
    semesterId: String(semesterId),
    ...(subjectId != null ? { subjectId: String(subjectId) } : {}),
  };

  const columns = [
    { header: "Enseignant", accessor: "teacher" },
    {
      header: "Matières",
      accessor: "subjects",
      className: "hidden md:table-cell",
    },
    {
      header: "Classes",
      accessor: "classes",
      className: "hidden md:table-cell",
    },
    {
      header: "Élèves notés",
      accessor: "gradedStudents",
      className: "hidden lg:table-cell",
    },
    {
      header: (
        <SortHeader
          label="Moyenne"
          field="average"
          currentSort={sort}
          currentDir={dir}
          baseParams={baseParams}
        />
      ),
      accessor: "average",
    },
    {
      header: (
        <SortHeader
          label="Taux de réussite"
          field="successRate"
          currentSort={sort}
          currentDir={dir}
          baseParams={baseParams}
        />
      ),
      accessor: "successRate",
    },
    {
      header: "Leçons/semaine",
      accessor: "lessonsPerWeek",
      className: "hidden lg:table-cell",
    },
  ];

  const renderRow = (t: TeacherStat) => (
    <tr
      key={t.teacherId}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-3 p-4">
        <Image
          src={t.img || "/noAvatar.png"}
          alt=""
          width={36}
          height={36}
          className="w-9 h-9 rounded-full object-cover"
        />
        <span className="font-medium">
          {t.name} {t.surname}
        </span>
      </td>
      <td className="hidden md:table-cell">
        {t.subjects.length > 0 ? t.subjects.join(", ") : "—"}
      </td>
      <td className="hidden md:table-cell">
        {t.classes.length > 0 ? t.classes.join(", ") : "—"}
      </td>
      <td className="hidden lg:table-cell">{t.gradedStudents}</td>
      <td className="pr-4">
        <AverageBar average={t.average} />
      </td>
      <td>{pct(t.successRate)}</td>
      <td className="hidden lg:table-cell">{t.lessonsPerWeek}</td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-6">
      {/* Header + filtres */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Statistiques enseignants</h1>
          <p className="text-sm text-gray-400">
            {semesters.find((s) => s.id === semesterId)?.name}
            {subjectId != null
              ? ` — ${subjects.find((s) => s.id === subjectId)?.name}`
              : " — toutes matières"}
          </p>
        </div>
        <StatsFilters
          semesters={semesters}
          subjects={subjects}
          currentSemesterId={semesterId}
          currentSubjectId={subjectId}
        />
      </div>

      {/* BarChart comparatif des moyennes (exclut les enseignants sans note) */}
      <div className="bg-white border rounded-2xl p-4 h-80 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">
          Moyennes obtenues par enseignant
        </h2>
        <div className="flex-1">
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune note saisie sur ce semestre pour les matières enseignées.
            </p>
          ) : (
            <TeacherBarChart data={chartData} />
          )}
        </div>
      </div>

      {/* Encadré méthodologique discret (brief E38) */}
      <div className="bg-lamaSkyLight rounded-md p-3 text-xs text-gray-500">
        <span className="font-semibold text-gray-600">Méthodologie : </span>
        moyenne des Results des élèves dans les couples classe×matière enseignés
        (via les Lessons de l&apos;enseignant), pondérée par le nombre de notes.
        Chaque note vaut (note d&apos;examen + note de classe)/2 si les deux
        existent, sinon la note présente. Si deux enseignants partagent un même
        couple classe×matière, les notes comptent pour les deux. Page
        descriptive, sans lien avec la rémunération.
      </div>

      {/* Tableau-classement (pas de pagination : effectif enseignant < 50) */}
      <Table columns={columns} renderRow={renderRow} data={stats} />
      {stats.length === 0 && (
        <p className="text-sm text-gray-400 -mt-2">Aucun enseignant en base.</p>
      )}
    </div>
  );
}
