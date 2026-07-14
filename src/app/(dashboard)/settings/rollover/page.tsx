import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sessionSchoolId } from "@/lib/authGuard";
import { invoiceBalance } from "@/lib/finance";
import RolloverStartForm from "./components/RolloverStartForm";
import RolloverWizard from "./components/RolloverWizard";

/**
 * W04 — Assistant de passage d'année (§2.1.3), intégré à l'écran Années
 * scolaires (/settings). Étape 1 sans `?target=` : préparation de la nouvelle
 * année ; ensuite le RSC charge tout le plan (classes, élèves, impayés) et le
 * client (RolloverWizard) collecte les décisions avant UNE validation serveur.
 */
const RolloverPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;

  // Défense en profondeur : admin uniquement
  if (role !== "admin") {
    redirect(`/${role ?? "sign-in"}`);
  }

  const schoolId = sessionSchoolId(session);

  const activeYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isActive: true },
  });

  if (!activeYear) {
    return (
      <div className="flex-1 m-4 mt-0 bg-white p-6 rounded-md">
        <h1 className="text-lg font-semibold mb-2">Passage d&apos;année</h1>
        <p className="text-sm text-gray-500">
          Aucune année scolaire active. Configurez d&apos;abord une année dans{" "}
          <Link href="/settings" className="text-blue-500 underline">
            les paramètres
          </Link>
          .
        </p>
      </div>
    );
  }

  const { target } = await searchParams;
  const targetYearId = target ? parseInt(target, 10) : NaN;

  // ---- Étape 1 : préparation (pas encore d'année cible choisie) ----
  if (!Number.isInteger(targetYearId)) {
    const candidateYears = await prisma.schoolYear.findMany({
      where: { schoolId, isActive: false },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    return (
      <div className="flex-1 m-4 mt-0 bg-white p-6 rounded-md">
        <h1 className="text-lg font-semibold">Passage d&apos;année</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Clôture de l&apos;année <b>{activeYear.name}</b> : préparez la
          nouvelle année scolaire, puis l&apos;assistant vous guidera
          (reconduction des classes, passage des élèves, report des impayés,
          bascule).
        </p>
        <RolloverStartForm
          candidateYears={candidateYears.map((y) => ({
            id: y.id,
            name: y.name,
            startDate: y.startDate.toISOString().slice(0, 10),
            endDate: y.endDate.toISOString().slice(0, 10),
          }))}
        />
      </div>
    );
  }

  // ---- Étapes 2→5 : l'année cible est choisie, on charge le plan ----
  const targetYear = await prisma.schoolYear.findFirst({
    where: { id: targetYearId, schoolId },
  });
  if (!targetYear || targetYear.isActive) {
    redirect("/settings/rollover");
  }

  const [levels, sourceClasses, targetClasses, enrollments] =
    await prisma.$transaction([
      prisma.level.findMany({
        where: { schoolId },
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      }),
      prisma.class.findMany({
        where: { schoolId, schoolYearId: activeYear.id },
        include: {
          level: { select: { name: true, order: true } },
          supervisor: { select: { name: true, surname: true } },
          _count: {
            select: {
              feeStructures: true,
              enrollments: { where: { status: "ACTIVE" } },
            },
          },
        },
        orderBy: [{ level: { order: "asc" } }, { name: "asc" }],
      }),
      prisma.class.findMany({
        where: { schoolId, schoolYearId: targetYear.id },
        include: { level: { select: { name: true, order: true } } },
        orderBy: { name: "asc" },
      }),
      // Élèves de l'année qui se clôt : tout statut SAUF TRANSFERRED (issue
      // déjà actée) pour qu'une relance puisse corriger une décision.
      prisma.enrollment.findMany({
        where: {
          schoolYearId: activeYear.id,
          status: { in: ["ACTIVE", "REPEATED", "LEFT", "GRADUATED"] },
          student: { schoolId },
        },
        include: {
          student: { select: { id: true, name: true, surname: true } },
          class: {
            select: { id: true, name: true, level: { select: { order: true } } },
          },
        },
        orderBy: [
          { class: { name: "asc" } },
          { student: { surname: "asc" } },
          { student: { name: "asc" } },
        ],
      }),
    ]);

  const studentIds = enrollments.map((e) => e.studentId);

  const [openInvoices, targetEnrollments, arrearsInvoices] =
    await prisma.$transaction([
      // Impayés de l'année qui se clôt (pour l'étape 4)
      prisma.invoice.findMany({
        where: {
          schoolYearId: activeYear.id,
          studentId: { in: studentIds },
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: { payments: { select: { amount: true } } },
      }),
      // Inscriptions déjà présentes sur l'année cible (relance de l'assistant)
      prisma.enrollment.findMany({
        where: { schoolYearId: targetYear.id, studentId: { in: studentIds } },
        select: { studentId: true, class: { select: { name: true } } },
      }),
      // Arriérés déjà générés (idempotence : clé rollover-{studentId}-{oldYearId})
      prisma.invoice.findMany({
        where: {
          schoolYearId: targetYear.id,
          generationKey: { startsWith: `rollover-` },
        },
        select: { generationKey: true },
      }),
    ]);

  const balanceByStudent = new Map<string, number>();
  for (const inv of openInvoices) {
    const b = invoiceBalance(inv);
    if (b <= 0) continue;
    balanceByStudent.set(
      inv.studentId,
      (balanceByStudent.get(inv.studentId) ?? 0) + b
    );
  }

  const targetEnrollmentByStudent = new Map(
    targetEnrollments.map((e) => [e.studentId, e.class.name])
  );
  // Clé exacte `rollover-{studentId}-{oldYearId}` → élèves déjà reportés
  // (match précis en JS : un endsWith "-1" matcherait aussi "-11").
  const arrearsKeyPattern = new RegExp(`^rollover-(.+)-${activeYear.id}$`);
  const arrearsDone = new Set(
    arrearsInvoices
      .map((i) => i.generationKey?.match(arrearsKeyPattern)?.[1])
      .filter((sid): sid is string => !!sid)
  );

  return (
    <div className="flex-1 m-4 mt-0">
      <RolloverWizard
        oldYear={{ id: activeYear.id, name: activeYear.name }}
        targetYear={{ id: targetYear.id, name: targetYear.name }}
        levels={levels}
        sourceClasses={sourceClasses.map((c) => ({
          id: c.id,
          name: c.name,
          capacity: c.capacity,
          levelName: c.level?.name ?? null,
          levelOrder: c.level?.order ?? null,
          supervisorName: c.supervisor
            ? `${c.supervisor.name} ${c.supervisor.surname}`
            : null,
          feeCount: c._count.feeStructures,
          activeCount: c._count.enrollments,
          existsOnTarget: targetClasses.some((t) => t.name === c.name),
        }))}
        targetClasses={targetClasses.map((c) => ({
          name: c.name,
          levelName: c.level?.name ?? null,
          levelOrder: c.level?.order ?? null,
        }))}
        students={enrollments.map((e) => ({
          id: e.studentId,
          fullName: `${e.student.surname} ${e.student.name}`,
          classId: e.class.id,
          className: e.class.name,
          levelOrder: e.class.level?.order ?? null,
          oldStatus: e.status,
          targetClassName: targetEnrollmentByStudent.get(e.studentId) ?? null,
          balance: balanceByStudent.get(e.studentId) ?? 0,
          arrearsDone: arrearsDone.has(e.studentId),
        }))}
      />
    </div>
  );
};

export default RolloverPage;
