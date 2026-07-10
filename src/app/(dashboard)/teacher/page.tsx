import Annoucement from "@/components/Annoucement";
import BigCalandarContainer from "@/components/BigCalandarContainer";
import { auth } from "@/lib/auth";
import { getTeacherClassesOverview } from "@/lib/stats/teacherClassStats";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  Edit,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

/**
 * Espace enseignant : SES classes (moyenne, réussite, présence, tendance et
 * ses matières) + son emploi du temps + raccourcis appel / saisie de notes.
 */

const fmtNote = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)} %`);

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null || Math.abs(delta) < 0.05) return null;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
      title="Écart de moyenne de classe entre les deux derniers semestres notés"
    >
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {up ? "+" : "−"}
      {fmtNote(Math.abs(delta))} pt
    </span>
  );
}

const TeacherPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;

  if (role !== "teacher" || !userId) {
    return notFound();
  }

  const classes = await getTeacherClassesOverview(userId);

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row flex-1">
      {/* LEFT — mes classes + emploi du temps */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {/* MES CLASSES */}
        <div className="bg-white p-4 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Mes classes</h1>
            <div className="flex gap-2">
              <Link
                href="/list/attendances/appel"
                className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white text-xs font-semibold rounded-md px-3 py-2 transition"
              >
                <ClipboardCheck size={14} />
                Faire l&apos;appel
              </Link>
              <Link
                href="/list/gradeEntry"
                className="flex items-center gap-2 bg-lamaPurple hover:opacity-80 text-gray-800 text-xs font-semibold rounded-md px-3 py-2 transition"
              >
                <Edit size={14} />
                Saisir des notes
              </Link>
            </div>
          </div>

          {classes.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune classe ne vous est encore attribuée (les classes viennent
              de vos cours planifiés).
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <div
                  key={c.classId}
                  className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-800">
                        {c.className}
                      </h2>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={12} />
                        {c.effectif} élève{c.effectif > 1 ? "s" : ""}
                        {c.semesterName ? ` · ${c.semesterName}` : ""}
                      </p>
                    </div>
                    <DeltaBadge delta={c.delta} />
                  </div>

                  {/* Chiffres clés de la classe */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-lamaPurpleLight px-2 py-2.5">
                      <div className="text-sm font-bold text-gray-800">
                        {c.moyenneClasse != null
                          ? `${fmtNote(c.moyenneClasse)}`
                          : "—"}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        Moyenne /20
                      </div>
                    </div>
                    <div className="rounded-xl bg-green-100 px-2 py-2.5">
                      <div className="text-sm font-bold text-gray-800">
                        {pct(c.tauxReussite)}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        Réussite (≥10)
                      </div>
                    </div>
                    <div className="rounded-xl bg-lamaSkyLight px-2 py-2.5">
                      <div className="text-sm font-bold text-gray-800">
                        {pct(c.tauxPresence)}
                      </div>
                      <div className="text-[10px] text-gray-600">Présence</div>
                    </div>
                  </div>

                  {/* Mes matières dans cette classe */}
                  {c.mySubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.mySubjects.map((name) => {
                        const avg = c.mySubjectAverages.find(
                          (s) => s.subjectName === name
                        );
                        return (
                          <span
                            key={name}
                            className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                          >
                            {name}
                            {avg ? (
                              <span className="font-semibold text-gray-800">
                                {" "}
                                · {fmtNote(avg.average)}/20
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <Link
                    href={`/stats/students?classId=${c.classId}`}
                    className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 transition"
                  >
                    <BarChart3 size={13} />
                    Statistiques détaillées
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EMPLOI DU TEMPS */}
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-2">Mon emploi du temps</h1>
          <div className="h-[700px]">
            <BigCalandarContainer type="teacherId" id={userId} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Annoucement />
      </div>
    </div>
  );
};
export default TeacherPage;
