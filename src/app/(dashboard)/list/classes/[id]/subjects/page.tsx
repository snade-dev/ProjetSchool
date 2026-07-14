import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sessionSchoolId } from "@/lib/authGuard";
import ClassSubjectSection from "@/components/ClassSubjectSection";

/**
 * W08 — Écran « Matières & coefficients » d'une classe (§2.1.6), accessible
 * depuis /list/classes. Admin et director uniquement : liste des matières de
 * la classe avec leur coefficient (éditable, flux de confirmation §2.1.6),
 * ajout/retrait d'une matière, bannière + bouton « Régénérer » quand des
 * bulletins sont périmés (ResultAverage.stale).
 */
const ClassSubjectsPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const classId = parseInt(id);
  if (Number.isNaN(classId)) return notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const schoolId = sessionSchoolId(session);
  if (role !== "admin" && role !== "director") return notFound();

  // V03 — cloisonnement : la classe doit appartenir à l'école de la session
  const klass = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: {
      id: true,
      name: true,
      evaluationSystem: true,
      schoolYearId: true,
      level: { select: { name: true } },
      schoolYear: { select: { name: true } },
      classSubjects: {
        select: {
          id: true,
          coefficient: true,
          subject: { select: { id: true, name: true } },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });
  if (!klass) return notFound();

  // Matières de l'école proposées à l'ajout
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Bulletins périmés de la classe (toutes périodes de l'année de la classe)
  const staleCount = await prisma.resultAverage.count({
    where: {
      stale: true,
      semester: { schoolYearId: klass.schoolYearId },
      student: { enrollments: { some: { classId: klass.id } } },
    },
  });

  const weighted = klass.evaluationSystem !== "MONTHLY";

  return (
    <div className="bg-white p-4 rounded-md m-4 mt-0 flex-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            Matières &amp; coefficients — {klass.name}
          </h1>
          <p className="text-xs text-gray-400">
            {klass.level?.name ? `${klass.level.name} · ` : ""}
            {klass.schoolYear.name} ·{" "}
            {weighted
              ? "Régime trimestriel : moyennes pondérées par coefficient (§2.1.6)"
              : "Régime compositions mensuelles : les coefficients ne pondèrent pas les moyennes (§2.3.1)"}
          </p>
        </div>
        <Link
          href="/list/classes"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
        >
          ← Retour aux classes
        </Link>
      </div>

      <ClassSubjectSection
        classId={klass.id}
        weighted={weighted}
        classSubjects={klass.classSubjects}
        subjects={subjects}
        staleCount={staleCount}
      />
    </div>
  );
};

export default ClassSubjectsPage;
