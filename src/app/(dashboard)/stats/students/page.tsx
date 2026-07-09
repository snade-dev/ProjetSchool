import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import {
  getClassStats,
  getSubjectAverages,
  getTopFlop,
  getClassTrend,
  type RankedStudent,
} from "@/lib/stats/studentStats";
import StatsFilters from "./components/StatsFilters";
import TrendLineChart from "./components/TrendLineChart";
import SubjectBarChart from "./components/SubjectBarChart";

type Option = { id: number; name: string };

/** Carte-statistique (style UserCard) : valeur + libellé. */
function StatTile({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "purple" | "yellow" | "sky" | "green";
}) {
  const bg =
    accent === "purple"
      ? "bg-lamaPurple"
      : accent === "yellow"
      ? "bg-lamaYellow"
      : accent === "sky"
      ? "bg-lamaSky"
      : "bg-green-100";
  return (
    <div className={`rounded-2xl ${bg} p-4 flex-1 min-w-[130px]`}>
      <h1 className="text-2xl font-semibold my-2">{value}</h1>
      <h2 className="text-sm font-medium text-gray-600 capitalize">{label}</h2>
    </div>
  );
}

/** Liste Top/Flop : élèves cliquables vers leur fiche, fond coloré (brief E37). */
function RankedList({
  title,
  students,
  variant,
}: {
  title: string;
  students: RankedStudent[];
  variant: "top" | "flop";
}) {
  const bg = variant === "top" ? "bg-green-50" : "bg-red-50";
  const badge =
    variant === "top" ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";
  return (
    <div className={`rounded-2xl ${bg} p-4 flex-1`}>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {students.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune moyenne disponible.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/list/students/${s.id}`}
                className="flex items-center gap-3 bg-white/70 hover:bg-white rounded-md p-2 transition-colors"
              >
                <Image
                  src={s.img || "/noAvatar.png"}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="flex-1 text-sm font-medium truncate">
                  {s.name} {s.surname}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${badge}`}
                >
                  {s.average.toFixed(2)} / 20
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const pct = (v: number | null) =>
  v == null ? "—" : `${Math.round(v * 100)} %`;

/**
 * E37 — Statistiques élèves (`/stats/students`), admin + teacher.
 * Filtres classe/semestre via searchParams (défauts : première classe autorisée,
 * dernier semestre). Teacher : classes limitées à ses Lessons + garde serveur.
 * student/parent → redirigés vers leur tableau de bord.
 */
export default async function StudentStatsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const info = await getSessionInfo();
  if (!info) return notFound();
  const { userId, role } = info;

  if (role === "student") redirect("/student");
  if (role === "parent") redirect("/parent");
  if (role !== "admin" && role !== "teacher") return notFound();

  const searchParams = await props.searchParams;

  // Classes autorisées selon le rôle.
  let classOptions: Option[] = [];
  if (role === "teacher") {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: userId },
      select: { class: { select: { id: true, name: true } } },
    });
    const classMap = new Map<number, string>();
    for (const l of lessons) classMap.set(l.class.id, l.class.name);
    classOptions = [...classMap]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } else {
    classOptions = await prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  const semesters = await prisma.semester.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  // Aucune donnée de base : sortie propre.
  if (classOptions.length === 0 || semesters.length === 0) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <h1 className="text-lg font-semibold">Statistiques élèves</h1>
        <p className="mt-6 text-sm text-gray-400">
          {classOptions.length === 0
            ? "Aucune classe accessible."
            : "Aucun semestre configuré."}
        </p>
      </div>
    );
  }

  const allowedClassIds = new Set(classOptions.map((c) => c.id));

  // Défauts : première classe autorisée, dernier semestre.
  const requestedClassId = searchParams.classId
    ? parseInt(searchParams.classId)
    : undefined;
  const requestedSemesterId = searchParams.semesterId
    ? parseInt(searchParams.semesterId)
    : undefined;

  // Garde serveur : classId hors périmètre (teacher) → redirect vers sa 1re classe.
  if (
    requestedClassId != null &&
    !allowedClassIds.has(requestedClassId)
  ) {
    redirect(`/stats/students?classId=${classOptions[0].id}`);
  }

  const classId = requestedClassId ?? classOptions[0].id;
  const semesterId =
    requestedSemesterId != null &&
    semesters.some((s) => s.id === requestedSemesterId)
      ? requestedSemesterId
      : semesters[semesters.length - 1].id;

  const currentClass = classOptions.find((c) => c.id === classId)!;

  const [stats, subjectAverages, topFlop, trend] = await Promise.all([
    getClassStats(classId, semesterId),
    getSubjectAverages(classId, semesterId),
    getTopFlop(classId, semesterId),
    getClassTrend(classId),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-6">
      {/* Header + filtres */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Statistiques élèves</h1>
          <p className="text-sm text-gray-400">
            {currentClass.name} —{" "}
            {semesters.find((s) => s.id === semesterId)?.name}
          </p>
        </div>
        <StatsFilters
          classes={classOptions}
          semesters={semesters}
          currentClassId={classId}
          currentSemesterId={semesterId}
        />
      </div>

      {/* Stat-tiles */}
      <div className="flex gap-4 flex-wrap">
        <StatTile
          accent="purple"
          label="Moyenne de classe"
          value={
            stats.moyenneClasse != null
              ? `${stats.moyenneClasse.toFixed(2)} / 20`
              : "—"
          }
        />
        <StatTile
          accent="green"
          label="Taux de réussite (≥10)"
          value={pct(stats.tauxReussite)}
        />
        <StatTile
          accent="sky"
          label="Taux de présence"
          value={pct(stats.tauxPresence)}
        />
        <StatTile
          accent="yellow"
          label="Effectif"
          value={String(stats.effectif)}
        />
      </div>

      {stats.gradedCount === 0 && (
        <p className="text-sm text-gray-400 -mt-2">
          Aucune moyenne enregistrée pour cette classe sur ce semestre (générez
          les bulletins pour alimenter les statistiques).
        </p>
      )}

      {/* Grille 2x2 : trend, matières, top/flop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LineChart évolution */}
        <div className="bg-white border rounded-2xl p-4 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">
            Évolution de la moyenne de classe par semestre
          </h2>
          <div className="flex-1">
            {trend.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune moyenne enregistrée pour cette classe.
              </p>
            ) : (
              <TrendLineChart data={trend} />
            )}
          </div>
        </div>

        {/* BarChart moyennes par matière */}
        <div className="bg-white border rounded-2xl p-4 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Moyenne par matière</h2>
          <div className="flex-1">
            {subjectAverages.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune note saisie pour ce semestre.
              </p>
            ) : (
              <SubjectBarChart data={subjectAverages} />
            )}
          </div>
        </div>

        {/* Top 5 / Flop 5 */}
        <RankedList title="Top 5" students={topFlop.top} variant="top" />
        <RankedList
          title="À suivre (Flop 5)"
          students={topFlop.flop}
          variant="flop"
        />
      </div>
    </div>
  );
}
