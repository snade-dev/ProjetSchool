import Annoucement from "@/components/Annoucement";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import ChildSubjectCompareChart from "@/components/stats/ChildSubjectCompareChart";
import ChildTrendChart from "@/components/stats/ChildTrendChart";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  buildChildSuggestions,
  getChildOverview,
  type ChildOverview,
  type Suggestion,
} from "@/lib/stats/childStats";
import { getMention } from "@/lib/setting";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  CheckSquare,
  FileText,
  GraduationCap,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/**
 * Espace parent : un bloc par enfant — identité et raccourcis, moyennes et
 * rang, progression entre les semestres, comparaison par matière avec la
 * classe, conseils dérivés des chiffres, puis emploi du temps de la classe.
 */

const fmtNote = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)} %`);

function StatTile({
  value,
  label,
  sub,
  bg,
}: {
  value: string;
  label: string;
  sub?: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl ${bg} p-4 flex-1 min-w-[130px]`}>
      <div className="text-xl font-semibold text-gray-800">{value}</div>
      <div className="text-xs font-medium text-gray-600">{label}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Badge de progression entre les deux derniers semestres notés. */
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-gray-400">—</span>;
  if (Math.abs(delta) < 0.05)
    return <span className="text-gray-600">stable</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        up ? "text-green-700" : "text-red-600"
      }`}
    >
      {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      {up ? "+" : "−"}
      {fmtNote(Math.abs(delta))} pt
    </span>
  );
}

const SUGGESTION_STYLE: Record<
  Suggestion["tone"],
  { bg: string; icon: React.ReactNode }
> = {
  warn: {
    bg: "bg-red-50 text-red-800 ring-1 ring-red-100",
    icon: <AlertTriangle size={15} className="mt-0.5 flex-none" />,
  },
  info: {
    bg: "bg-lamaSkyLight/60 text-sky-900 ring-1 ring-lamaSky/40",
    icon: <Lightbulb size={15} className="mt-0.5 flex-none" />,
  },
  good: {
    bg: "bg-green-50 text-green-800 ring-1 ring-green-100",
    icon: <CheckCircle2 size={15} className="mt-0.5 flex-none" />,
  },
};

function ChildStats({ overview }: { overview: ChildOverview }) {
  const { latest, delta, rank, trend, subjects, attendance } = overview;
  const suggestions = buildChildSuggestions(overview);

  return (
    <>
      {/* Tuiles : moyenne, rang, progression, présence */}
      <div className="mt-4 flex flex-wrap gap-3">
        <StatTile
          bg="bg-lamaPurpleLight"
          value={latest ? `${fmtNote(latest.average)} / 20` : "—"}
          label="Moyenne générale"
          sub={
            latest ? `${latest.semesterName} · ${getMention(latest.average)}` : "Pas encore de note"
          }
        />
        <StatTile
          bg="bg-lamaSkyLight"
          value={
            rank
              ? `${rank.rank === 1 ? "1ᵉʳ" : `${rank.rank}ᵉ`} / ${rank.of}`
              : "—"
          }
          label="Rang dans la classe"
          sub={latest?.semesterName}
        />
        <div className="rounded-2xl bg-lamaYellowLight p-4 flex-1 min-w-[130px]">
          <div className="text-xl font-semibold">
            <DeltaBadge delta={delta} />
          </div>
          <div className="text-xs font-medium text-gray-600">Progression</div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {trend.length > 1
              ? `${trend[trend.length - 2].semesterName} → ${
                  trend[trend.length - 1].semesterName
                }`
              : "Un seul semestre noté"}
          </div>
        </div>
        <StatTile
          bg="bg-green-100"
          value={pct(attendance.rate)}
          label="Présence"
          sub={
            attendance.total > 0
              ? `${attendance.present}/${attendance.total} pointages`
              : "Aucun pointage"
          }
        />
      </div>

      {/* Graphiques : évolution + comparaison matière/classe */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-100 rounded-2xl p-4 h-72 flex flex-col">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">
            Évolution de la moyenne générale
          </h4>
          <div className="flex-1">
            {trend.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune moyenne enregistrée pour l&apos;instant.
              </p>
            ) : (
              <ChildTrendChart data={trend} />
            )}
          </div>
        </div>
        <div className="border border-gray-100 rounded-2xl p-4 h-72 flex flex-col">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">
            Par matière — votre enfant face à la classe
            {latest ? ` (${latest.semesterName})` : ""}
          </h4>
          <div className="flex-1">
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune note par matière sur le dernier semestre.
              </p>
            ) : (
              <ChildSubjectCompareChart
                data={subjects.map((s) => ({
                  subjectName: s.subjectName,
                  enfant: s.studentAvg,
                  classe: s.classAvg,
                }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Conseils */}
      <div className="mt-4 border border-gray-100 rounded-2xl p-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">
          Conseils pour progresser
        </h4>
        <ul className="flex flex-col gap-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${SUGGESTION_STYLE[s.tone].bg}`}
            >
              {SUGGESTION_STYLE[s.tone].icon}
              <span>{s.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const ParentPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (role !== "parent" || !userId) {
    return notFound();
  }

  // W05 — les enfants du parent viennent de StudentGuardian (tuteurs multiples),
  // avec les droits différenciés du lien (§2.2.3).
  // W03 — la classe de chaque enfant = son inscription sur l'année active
  const guardianRows = await prisma.studentGuardian.findMany({
    where: { parentId: userId },
    select: {
      canViewGrades: true,
      canPay: true,
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          img: true,
          enrollments: {
            where: { schoolYear: { isActive: true } },
            select: { class: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });
  const children = guardianRows.map((g) => ({
    id: g.student.id,
    name: g.student.name,
    surname: g.student.surname,
    img: g.student.img,
    class: g.student.enrollments[0]?.class ?? null,
    canViewGrades: g.canViewGrades,
    canPay: g.canPay,
  }));

  // W05 — pas de calcul de stats pour un enfant dont les notes sont masquées
  const overviews = await Promise.all(
    children.map((c) =>
      c.canViewGrades ? getChildOverview(c.id, c.class?.id ?? -1) : null
    )
  );

  const links = (child: (typeof children)[number]) => [
    {
      href: `/list/students/${child.id}`,
      label: child.canViewGrades ? "Bulletin & fiche" : "Fiche élève",
      icon: Award,
      bg: "bg-lamaSkyLight",
    },
    // W05 — canViewGrades=false masque l'accès aux résultats
    ...(child.canViewGrades
      ? [
          {
            href: `/list/results?studentId=${child.id}`,
            label: "Résultats",
            icon: GraduationCap,
            bg: "bg-lamaPurpleLight",
          },
        ]
      : []),
    {
      href: `/list/attendances`,
      label: "Présences",
      icon: CheckSquare,
      bg: "bg-lamaYellowLight",
    },
    // W05 — canPay=false : le solde reste consultable, seuls les écrans de
    // paiement sont masqués (les encaissements sont côté admin de toute façon)
    {
      href: `/list/invoices`,
      label: "Factures",
      icon: FileText,
      bg: "bg-pink-50",
    },
  ];

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row flex-1">
      {/* LEFT — un bloc par enfant */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {children.length === 0 ? (
          <div className="bg-white p-8 rounded-md text-center text-sm text-gray-400">
            Aucun enfant n&apos;est rattaché à votre compte. Contactez
            l&apos;administration.
          </div>
        ) : (
          children.map((child, i) => (
            <div key={child.id} className="bg-white p-4 rounded-md">
              {/* Identité + raccourcis */}
              <div className="flex flex-wrap items-center gap-4">
                <Image
                  src={child.img || "/noAvatar.png"}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="mr-auto">
                  <h2 className="text-lg font-semibold">
                    {child.name} {child.surname}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Classe : {child.class?.name ?? "Non inscrit"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {links(child).map(({ href, label, icon: Icon, bg }) => (
                    <Link
                      key={label}
                      href={href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${bg} hover:opacity-80 transition`}
                    >
                      <Icon size={14} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Notes, progression, comparaison, conseils — W05 : masqués si
                  le tuteur n'a pas le droit de voir les notes (canViewGrades) */}
              {overviews[i] ? (
                <ChildStats overview={overviews[i]!} />
              ) : (
                <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-[13px] text-gray-400">
                  La consultation des notes et bulletins n&apos;est pas activée
                  pour votre compte. Contactez l&apos;administration.
                </p>
              )}

              {/* Emploi du temps de la classe de l'enfant */}
              {child.class && (
                <div className="mt-4 h-[560px]">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">
                    Emploi du temps — {child.class.name}
                  </h3>
                  <div className="h-[520px]">
                    <BigCalandarContainer type="classId" id={child.class.id} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Annoucement />
      </div>
    </div>
  );
};
export default ParentPage;
