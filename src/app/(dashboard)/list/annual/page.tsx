import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import FormContainer from "@/components/FormContainer";
import AnnualBulletinButton from "@/components/pdf/AnnualBulletinButton";
import { buildClassAnnualReports } from "@/lib/annualReport";
import { GraduationCap } from "lucide-react";

/**
 * X07 — Fin d'année : bilan par élève (conduite, décision, observations) et
 * bulletins ANNUELS d'une classe. La classe se choisit en URL (?classId=…).
 *
 * Le tableau montre l'agrégat des périodes déjà notées : une colonne vide veut
 * dire que les bulletins de période n'ont pas encore été générés (le bulletin
 * annuel consolide `ResultAverage`, il ne recalcule pas les moyennes).
 */

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toFixed(2).replace(".", ",");

const AnnualPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const userId = session?.user.id;
  const schoolId = sessionSchoolId(session);

  if (!["admin", "director", "teacher", "supervisor"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }

  let activeYear;
  try {
    activeYear = await getActiveSchoolYear(schoolId);
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">Fin d&apos;année</h1>
          <div className="bg-lamaYellowLight border border-lamaYellow text-yellow-800 text-sm p-4 rounded-md">
            Aucune année scolaire active. Configurez une année scolaire dans{" "}
            <a href="/settings" className="underline font-medium">
              /settings
            </a>
            .
          </div>
        </div>
      </div>
    );
  }

  // Un enseignant ne voit que les classes dont il est TITULAIRE : c'est lui qui
  // signe « Le Maître » et remplit le bilan (l'action revérifie la règle).
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      schoolYearId: activeYear.id,
      ...(role === "teacher" ? { supervisorId: userId! } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const selectedClassId = searchParams.classId
    ? parseInt(searchParams.classId)
    : classes[0]?.id;

  // Défense en profondeur : la classe demandée doit être dans la liste permise.
  const allowed = classes.some((c) => c.id === selectedClassId);
  const reports =
    selectedClassId != null && allowed
      ? await buildClassAnnualReports(selectedClassId)
      : new Map();

  const enrollments =
    selectedClassId != null && allowed
      ? await prisma.enrollment.findMany({
          where: { classId: selectedClassId, schoolYearId: activeYear.id },
          select: { id: true, studentId: true },
        })
      : [];
  const enrollmentByStudent = new Map(
    enrollments.map((e) => [e.studentId, e.id])
  );

  const rows = [...reports.values()].sort(
    (a, b) =>
      a.student.name.localeCompare(b.student.name, "fr") ||
      a.student.surname.localeCompare(b.student.surname, "fr")
  );

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="bg-white p-4 rounded-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            Fin d&apos;année — bilans et bulletins annuels
          </h1>
          <p className="text-xs text-gray-400">
            Année scolaire {activeYear.name}
          </p>
        </div>
        {classes.length > 0 && (
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">
                Classe
              </label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-lamaSky"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-lamaSky px-4 py-2 text-sm font-medium text-sky-900 transition hover:brightness-95"
            >
              Afficher
            </button>
          </form>
        )}
      </div>

      <div className="bg-white p-4 rounded-md">
        {classes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <GraduationCap size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              {role === "teacher"
                ? "Vous n'êtes titulaire d'aucune classe cette année."
                : "Aucune classe sur l'année active."}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <GraduationCap size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucun élève inscrit dans cette classe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-3">Élève</th>
                  <th className="p-3 text-center">Périodes notées</th>
                  <th className="p-3 text-right">Moyenne annuelle</th>
                  <th className="p-3 text-center">Rang</th>
                  <th className="p-3 hidden lg:table-cell">Conduite</th>
                  <th className="p-3 hidden lg:table-cell">Décision</th>
                  <th className="p-3 text-center hidden md:table-cell">
                    Abs. / Ret.
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.student.id}
                    className="border-b border-gray-100 even:bg-slate-50"
                  >
                    <td className="p-3">
                      <div className="font-medium">
                        {r.student.name} {r.student.surname}
                      </div>
                      <div className="text-xs text-gray-400">
                        {r.student.username}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {r.gradedPeriods} / {r.periods.length}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {fmt(r.annualAverage)}
                    </td>
                    <td className="p-3 text-center">
                      {r.rank != null
                        ? `${r.rank} / ${r.gradedStudentCount}`
                        : "—"}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {r.conduct ?? (
                        <span className="text-gray-300">à renseigner</span>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {r.annualDecision ?? (
                        <span className="text-gray-300">à renseigner</span>
                      )}
                    </td>
                    <td className="p-3 text-center hidden md:table-cell">
                      {r.absences} / {r.lateCount ?? "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <AnnualBulletinButton data={r} compact />
                        <FormContainer
                          table="annualAssessment"
                          type="update"
                          data={{
                            enrollmentId: enrollmentByStudent.get(
                              r.student.id
                            ),
                            studentName: `${r.student.name} ${r.student.surname}`,
                            username: r.student.username,
                            className: r.className,
                            conduct: r.conduct,
                            workAppreciation: r.workAppreciation,
                            annualDecision: r.annualDecision,
                            annualObservation: r.annualObservation,
                            lateCount: r.lateCount,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnualPage;
